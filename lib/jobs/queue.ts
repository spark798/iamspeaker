import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import type { JobType } from "@/lib/domain";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

export type JobRecord = typeof jobs.$inferSelect;

export interface QueueOptions {
  /** enqueue 시 기본 최대 시도 횟수(재시도 포함). 기본 1 = 무재시도. 앱은 config 주입. */
  maxAttempts?: number;
  /** 재시도 백오프 기준(ms). 지연 = base × 2^(attempt-1). */
  retryBaseMs?: number;
  /** 현재 시각(ms) 주입 — 테스트에서 백오프/TTL을 결정적으로 검증. */
  now?: () => number;
}

/**
 * SQLite jobs 테이블 기반 작업 큐. 외부 브로커 없이 단일 프로세스에서 동작(DEVELOPMENT §6).
 * better-sqlite3는 동기 API이므로 트랜잭션으로 원자적 claim이 가능하다.
 *
 * 신뢰성(Q2): 실패 시 지수 백오프로 재시도하고, 시도 소진 시 terminal `failed`(dead-letter)로
 * 남긴다. 재시도 중에는 `queued`로 되돌리므로 상태를 폴링하는 클라이언트엔 투명하다.
 */
export class JobQueue {
  private readonly defaultMaxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly clock: () => number;

  constructor(
    private readonly db: Db,
    opts: QueueOptions = {},
  ) {
    this.defaultMaxAttempts = Math.max(1, opts.maxAttempts ?? 1);
    this.retryBaseMs = Math.max(1, opts.retryBaseMs ?? 1000);
    this.clock = opts.now ?? Date.now;
  }

  /** 작업 추가. 반환 = jobId. */
  enqueue(
    type: JobType,
    payload: unknown,
    sessionId?: string,
    opts: { maxAttempts?: number } = {},
  ): string {
    const id = randomUUID();
    const maxAttempts = Math.max(1, opts.maxAttempts ?? this.defaultMaxAttempts);
    this.db
      .insert(jobs)
      .values({
        id,
        type,
        sessionId: sessionId ?? null,
        status: "queued",
        progress: 0,
        attempt: 0,
        maxAttempts,
        payload,
      })
      .run();
    return id;
  }

  get(id: string): JobRecord | undefined {
    return this.db.select().from(jobs).where(eq(jobs.id, id)).get();
  }

  /**
   * 가장 오래된, 실행 가능(nextRunAt 도래)한 queued 작업을 원자적으로 running으로 전환(FIFO).
   * claim 시 attempt를 1 증가시켜 현재 실행 회차를 기록한다.
   */
  claimNext(): JobRecord | undefined {
    return this.db.transaction((tx) => {
      const nowDate = new Date(this.clock());
      const next = tx
        .select()
        .from(jobs)
        .where(
          and(eq(jobs.status, "queued"), or(isNull(jobs.nextRunAt), lte(jobs.nextRunAt, nowDate))),
        )
        .orderBy(asc(jobs.createdAt), sql`rowid`)
        .limit(1)
        .get();
      if (!next) return undefined;
      const attempt = next.attempt + 1;
      tx.update(jobs)
        .set({ status: "running", startedAt: nowDate, attempt, nextRunAt: null })
        .where(eq(jobs.id, next.id))
        .run();
      return { ...next, status: "running", startedAt: nowDate, attempt };
    });
  }

  setProgress(id: string, progress: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    // running 상태일 때만 — 타임아웃으로 failed/재큐된 작업을 늦게 끝난 핸들러가 되살리지 못하게.
    this.db
      .update(jobs)
      .set({ progress: clamped })
      .where(and(eq(jobs.id, id), eq(jobs.status, "running")))
      .run();
  }

  complete(id: string, result: unknown): void {
    // running 상태일 때만 succeeded로 — 이미 failed/재큐된 작업의 늦은 완료를 무시.
    this.db
      .update(jobs)
      .set({ status: "succeeded", progress: 100, result, finishedAt: new Date(this.clock()) })
      .where(and(eq(jobs.id, id), eq(jobs.status, "running")))
      .run();
  }

  /**
   * 실행 중 작업 실패 처리. 시도 여력이 남았으면 지수 백오프로 재큐(queued + nextRunAt),
   * 소진 시 terminal `failed`(dead-letter)로 확정한다. running 상태일 때만 동작.
   */
  fail(id: string, message: string): void {
    const job = this.get(id);
    if (!job || job.status !== "running") return;
    const now = this.clock();
    if (job.attempt < job.maxAttempts) {
      const delay = this.retryBaseMs * 2 ** (job.attempt - 1);
      this.db
        .update(jobs)
        .set({
          status: "queued",
          error: message,
          startedAt: null,
          nextRunAt: new Date(now + delay),
        })
        .where(and(eq(jobs.id, id), eq(jobs.status, "running")))
        .run();
    } else {
      this.db
        .update(jobs)
        .set({ status: "failed", error: message, finishedAt: new Date(now) })
        .where(and(eq(jobs.id, id), eq(jobs.status, "running")))
        .run();
    }
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

  /**
   * 완료(succeeded) 작업 TTL 정리: finishedAt이 beforeMs 이전인 성공 작업을 삭제한다.
   * 실패(dead-letter)는 사후 점검을 위해 보존. 반환 = 삭제 개수.
   */
  purgeFinished(beforeMs: number): number {
    const res = this.db
      .delete(jobs)
      .where(and(eq(jobs.status, "succeeded"), lte(jobs.finishedAt, new Date(beforeMs))))
      .run();
    return res.changes;
  }

  /** dead-letter 목록: 재시도 소진으로 terminal failed가 된 작업들. */
  deadLetters(): JobRecord[] {
    return this.db.select().from(jobs).where(eq(jobs.status, "failed")).all();
  }
}
