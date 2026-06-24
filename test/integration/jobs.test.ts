import { type Db, createDb } from "@/lib/db/client";
import { JobQueue } from "@/lib/jobs/queue";
import { Worker } from "@/lib/jobs/worker";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

let db: Db;
let queue: JobQueue;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./lib/db/migrations" });
  queue = new JobQueue(db);
});

describe("JobQueue", () => {
  it("enqueue → queued 상태로 저장된다", () => {
    const id = queue.enqueue("parse", { foo: 1 }, "sess-1");
    const job = queue.get(id);
    expect(job?.status).toBe("queued");
    expect(job?.progress).toBe(0);
    expect(job?.type).toBe("parse");
    expect(job?.sessionId).toBe("sess-1");
  });

  it("claimNext: 오래된 것부터(FIFO) running으로 전환", () => {
    const a = queue.enqueue("parse", {});
    const b = queue.enqueue("demo", {});
    const first = queue.claimNext();
    expect(first?.id).toBe(a);
    expect(first?.status).toBe("running");
    expect(queue.get(a)?.startedAt).toBeInstanceOf(Date);
    expect(queue.claimNext()?.id).toBe(b);
    expect(queue.claimNext()).toBeUndefined();
  });

  it("recoverStalled: running 작업을 queued로 되돌린다", () => {
    const id = queue.enqueue("parse", {});
    queue.claimNext();
    expect(queue.get(id)?.status).toBe("running");
    expect(queue.recoverStalled()).toBe(1);
    expect(queue.get(id)?.status).toBe("queued");
  });

  it("claimNext: attempt를 증가시킨다", () => {
    const id = queue.enqueue("parse", {});
    expect(queue.get(id)?.attempt).toBe(0);
    expect(queue.claimNext()?.attempt).toBe(1);
    expect(queue.get(id)?.attempt).toBe(1);
  });
});

describe("JobQueue — 재시도/백오프/dead-letter (Q2-6)", () => {
  let now = 0;
  let q: JobQueue;
  beforeEach(() => {
    now = 1_000_000;
    q = new JobQueue(db, { maxAttempts: 3, retryBaseMs: 1000, now: () => now });
  });

  it("실패 시 시도 여력이 있으면 백오프로 재큐(queued + nextRunAt)", () => {
    const id = q.enqueue("parse", {});
    q.claimNext(); // attempt=1
    q.fail(id, "boom");
    const job = q.get(id);
    expect(job?.status).toBe("queued");
    expect(job?.error).toBe("boom");
    // base × 2^(1-1) = 1000ms 후
    expect(job?.nextRunAt?.getTime()).toBe(now + 1000);
  });

  it("nextRunAt 도래 전에는 claim되지 않는다", () => {
    const id = q.enqueue("parse", {});
    q.claimNext();
    q.fail(id, "boom"); // nextRunAt = now+1000
    expect(q.claimNext()).toBeUndefined();
    now += 1000;
    expect(q.claimNext()?.id).toBe(id); // attempt=2
  });

  it("백오프는 시도마다 지수적으로 증가한다", () => {
    const id = q.enqueue("parse", {});
    q.claimNext(); // attempt=1
    q.fail(id, "e1");
    expect(q.get(id)?.nextRunAt?.getTime()).toBe(now + 1000); // 2^0
    now += 1000;
    q.claimNext(); // attempt=2
    q.fail(id, "e2");
    expect(q.get(id)?.nextRunAt?.getTime()).toBe(now + 2000); // 2^1
  });

  it("시도 소진 시 terminal failed(dead-letter)로 확정", () => {
    const id = q.enqueue("parse", {});
    for (let i = 0; i < 3; i++) {
      now += 10_000;
      expect(q.claimNext()?.id).toBe(id);
      q.fail(id, `e${i}`);
    }
    const job = q.get(id);
    expect(job?.status).toBe("failed");
    expect(job?.attempt).toBe(3);
    expect(q.deadLetters().map((j) => j.id)).toContain(id);
    // dead-letter는 더 이상 claim되지 않음
    now += 10_000;
    expect(q.claimNext()).toBeUndefined();
  });

  it("maxAttempts=1(기본)이면 1회 실패로 즉시 terminal failed", () => {
    const q1 = new JobQueue(db); // 기본 maxAttempts=1
    const id = q1.enqueue("demo", {});
    q1.claimNext();
    q1.fail(id, "boom");
    expect(q1.get(id)?.status).toBe("failed");
  });

  it("running이 아닌 작업의 fail/complete는 무시(늦은 핸들러 방어)", () => {
    const id = q.enqueue("parse", {});
    q.claimNext();
    q.fail(id, "first"); // queued로 재큐
    q.complete(id, { late: true }); // running 아님 → 무시
    expect(q.get(id)?.status).toBe("queued");
    expect(q.get(id)?.result).toBeNull();
  });
});

describe("JobQueue — 완료 잡 TTL 정리 (Q2-6)", () => {
  it("purgeFinished: 기준 이전 succeeded만 삭제, 실패/실행중은 보존", () => {
    let now = 5_000_000;
    const q = new JobQueue(db, { now: () => now });
    const ok = q.enqueue("parse", {});
    q.claimNext();
    q.complete(ok, { done: true }); // finishedAt = 5_000_000
    const failed = q.enqueue("demo", {});
    q.claimNext();
    q.fail(failed, "boom"); // terminal failed (maxAttempts=1)

    now += 1000;
    // 기준 = now - 1(완료 시점 직후) → succeeded 삭제, failed 보존
    expect(q.purgeFinished(now)).toBe(1);
    expect(q.get(ok)).toBeUndefined();
    expect(q.get(failed)?.status).toBe("failed");
  });

  it("purgeFinished: 기준 이전이 아니면 삭제하지 않는다", () => {
    const now = 6_000_000;
    const q = new JobQueue(db, { now: () => now });
    const ok = q.enqueue("parse", {});
    q.claimNext();
    q.complete(ok, {});
    expect(q.purgeFinished(now - 10_000)).toBe(0);
    expect(q.get(ok)?.status).toBe("succeeded");
  });
});

describe("Worker", () => {
  it("핸들러 성공 → succeeded + progress 100 + result 저장", async () => {
    const id = queue.enqueue("parse", { n: 2 });
    const worker = new Worker(queue, {
      parse: async (_job, ctx) => {
        ctx.setProgress(50);
        return { ok: true };
      },
    });
    expect(await worker.processOnce()).toBe(true);
    const job = queue.get(id);
    expect(job?.status).toBe("succeeded");
    expect(job?.progress).toBe(100);
    expect(job?.result).toEqual({ ok: true });
  });

  it("핸들러 throw → failed + error 메시지 저장", async () => {
    const id = queue.enqueue("demo", {});
    const worker = new Worker(queue, {
      demo: async () => {
        throw new Error("boom");
      },
    });
    await worker.processOnce();
    const job = queue.get(id);
    expect(job?.status).toBe("failed");
    expect(job?.error).toContain("boom");
  });

  it("핸들러 미등록 → failed", async () => {
    const id = queue.enqueue("export", {});
    await new Worker(queue, {}).processOnce();
    expect(queue.get(id)?.status).toBe("failed");
  });

  it("빈 큐 → processOnce는 false", async () => {
    expect(await new Worker(queue, {}).processOnce()).toBe(false);
  });

  it("핸들러 타임아웃 → failed + 타임아웃 메시지", async () => {
    const id = queue.enqueue("parse", {});
    const worker = new Worker(
      queue,
      { parse: () => new Promise<never>(() => {}) },
      { timeoutSec: 1 },
    );
    await worker.processOnce();
    const job = queue.get(id);
    expect(job?.status).toBe("failed");
    expect(job?.error).toContain("타임아웃");
  });
});
