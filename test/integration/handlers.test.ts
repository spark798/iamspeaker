import { randomUUID } from "node:crypto";
import { stubAdapters } from "@/lib/ai/stub";
import { type Db, createDb } from "@/lib/db/client";
import { qaItems, scripts, sessions, slideCritiques, slides } from "@/lib/db/schema";
import { createHandlers } from "@/lib/jobs/handlers";
import { JobQueue } from "@/lib/jobs/queue";
import { Worker } from "@/lib/jobs/worker";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

let db: Db;
let queue: JobQueue;
let worker: Worker;
let sessionId: string;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./lib/db/migrations" });
  queue = new JobQueue(db);
  worker = new Worker(queue, createHandlers(db, stubAdapters()));

  sessionId = randomUUID();
  db.insert(sessions)
    .values({ id: sessionId, slideFilePath: "(inline)", targetDurationSec: 300, tone: "formal" })
    .run();
  db.insert(slides)
    .values([
      { id: randomUUID(), sessionId, slideIndex: 0, textContent: "Problem: churn", notes: null },
      { id: randomUUID(), sessionId, slideIndex: 1, textContent: "Solution: ML", notes: null },
    ])
    .run();
});

describe("walking skeleton 핸들러 (전 체인: 큐→워커→어댑터→DB)", () => {
  it("demo: 슬라이드 → 스크립트(v0) 저장, job succeeded", async () => {
    const jobId = queue.enqueue("demo", { sessionId }, sessionId);
    expect(await worker.processOnce()).toBe(true);

    const job = queue.get(jobId);
    expect(job?.status).toBe("succeeded");
    expect(job?.progress).toBe(100);

    const script = db.select().from(scripts).where(eq(scripts.sessionId, sessionId)).get();
    expect(script?.version).toBe(0);
    expect(script?.source).toBe("ai_demo");
    expect(script?.content).toHaveLength(2);
  });

  it("critique: 슬라이드 수만큼 비평 저장", async () => {
    queue.enqueue("critique", { sessionId }, sessionId);
    await worker.processOnce();
    const rows = db
      .select()
      .from(slideCritiques)
      .where(eq(slideCritiques.sessionId, sessionId))
      .all();
    expect(rows).toHaveLength(2);
  });

  it("qa_generate: 스크립트 선행 필요, 질문 저장", async () => {
    // 스크립트 없으면 실패
    const failId = queue.enqueue("qa_generate", { sessionId }, sessionId);
    await worker.processOnce();
    expect(queue.get(failId)?.status).toBe("failed");

    // demo로 스크립트 생성 후 재시도
    queue.enqueue("demo", { sessionId }, sessionId);
    await worker.processOnce();
    const okId = queue.enqueue("qa_generate", { sessionId, count: 3 }, sessionId);
    await worker.processOnce();

    expect(queue.get(okId)?.status).toBe("succeeded");
    const items = db.select().from(qaItems).all();
    expect(items).toHaveLength(3);
    for (const q of items) {
      expect(["easy", "tough"]).toContain(q.difficulty);
    }
  });
});
