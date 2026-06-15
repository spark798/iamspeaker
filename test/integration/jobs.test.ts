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
