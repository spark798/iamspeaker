import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import type { JobType } from "@/lib/domain";
import { asc, eq, sql } from "drizzle-orm";

export type JobRecord = typeof jobs.$inferSelect;

/**
 * SQLite jobs 테이블 기반 작업 큐. 외부 브로커 없이 단일 프로세스에서 동작(DEVELOPMENT §6).
 * better-sqlite3는 동기 API이므로 트랜잭션으로 원자적 claim이 가능하다.
 */
export class JobQueue {
  constructor(private readonly db: Db) {}

  /** 작업 추가. 반환 = jobId. */
  enqueue(type: JobType, payload: unknown, sessionId?: string): string {
    const id = randomUUID();
    this.db
      .insert(jobs)
      .values({ id, type, sessionId: sessionId ?? null, status: "queued", progress: 0, payload })
      .run();
    return id;
  }

  get(id: string): JobRecord | undefined {
    return this.db.select().from(jobs).where(eq(jobs.id, id)).get();
  }

  /** 가장 오래된 queued 작업을 원자적으로 running으로 전환해 가져온다(FIFO). */
  claimNext(): JobRecord | undefined {
    return this.db.transaction((tx) => {
      const next = tx
        .select()
        .from(jobs)
        .where(eq(jobs.status, "queued"))
        .orderBy(asc(jobs.createdAt), sql`rowid`)
        .limit(1)
        .get();
      if (!next) return undefined;
      const startedAt = new Date();
      tx.update(jobs).set({ status: "running", startedAt }).where(eq(jobs.id, next.id)).run();
      return { ...next, status: "running", startedAt };
    });
  }

  setProgress(id: string, progress: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    this.db.update(jobs).set({ progress: clamped }).where(eq(jobs.id, id)).run();
  }

  complete(id: string, result: unknown): void {
    this.db
      .update(jobs)
      .set({ status: "succeeded", progress: 100, result, finishedAt: new Date() })
      .where(eq(jobs.id, id))
      .run();
  }

  fail(id: string, message: string): void {
    this.db
      .update(jobs)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(jobs.id, id))
      .run();
  }

  /** 크래시 복구: running으로 남은 작업을 queued로 되돌린다. 반환 = 복구 개수. */
  recoverStalled(): number {
    const stalled = this.db.select().from(jobs).where(eq(jobs.status, "running")).all();
    if (stalled.length > 0) {
      this.db
        .update(jobs)
        .set({ status: "queued", startedAt: null })
        .where(eq(jobs.status, "running"))
        .run();
    }
    return stalled.length;
  }
}
