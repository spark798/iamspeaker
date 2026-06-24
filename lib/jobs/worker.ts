import type { JobType } from "@/lib/domain";
import { logger } from "@/lib/logger";
import type { JobQueue, JobRecord } from "./queue";

export interface JobContext {
  setProgress(progress: number): void;
}

export type JobHandler = (job: JobRecord, ctx: JobContext) => Promise<unknown>;
export type JobHandlers = Partial<Record<JobType, JobHandler>>;

export interface WorkerOptions {
  concurrency?: number;
  pollMs?: number;
  /** 핸들러 1건당 최대 실행 시간(초). 초과 시 작업 failed 처리. */
  timeoutSec?: number;
  /** 완료(succeeded) 작업 TTL(시간). 0 이하면 정리 비활성. */
  ttlHours?: number;
  /** TTL 정리 주기(ms). 기본 1시간. */
  purgeIntervalMs?: number;
}

/**
 * 인프로세스 워커. 큐를 폴링해 concurrency 만큼 동시 처리한다.
 * 핸들러가 없거나 throw하면 작업을 failed로 기록(원본 에러는 로그).
 */
export class Worker {
  private inFlight = 0;
  private timer: NodeJS.Timeout | null = null;
  private purgeTimer: NodeJS.Timeout | null = null;
  private readonly concurrency: number;
  private readonly pollMs: number;
  private readonly timeoutMs: number;
  private readonly ttlMs: number;
  private readonly purgeIntervalMs: number;

  constructor(
    private readonly queue: JobQueue,
    private readonly handlers: JobHandlers,
    opts: WorkerOptions = {},
  ) {
    this.concurrency = Math.max(1, opts.concurrency ?? 1);
    this.pollMs = Math.max(50, opts.pollMs ?? 250);
    this.timeoutMs = Math.max(1, opts.timeoutSec ?? 600) * 1000;
    this.ttlMs = Math.max(0, opts.ttlHours ?? 0) * 3600 * 1000;
    this.purgeIntervalMs = Math.max(60_000, opts.purgeIntervalMs ?? 3600_000);
  }

  /** 큐에서 1건을 꺼내 처리. 처리할 작업이 없으면 false. (테스트/수동 구동용) */
  async processOnce(): Promise<boolean> {
    const job = this.queue.claimNext();
    if (!job) return false;
    await this.run(job);
    return true;
  }

  /** 크래시 복구 후 폴링 루프 + 완료 잡 TTL 정리를 시작한다. */
  start(): void {
    const recovered = this.queue.recoverStalled();
    if (recovered > 0) {
      logger.warn({ recovered }, "stalled 작업 복구(running→queued)");
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.poll();
    }, this.pollMs);
    this.timer.unref?.();

    if (this.ttlMs > 0 && !this.purgeTimer) {
      this.purge();
      this.purgeTimer = setInterval(() => this.purge(), this.purgeIntervalMs);
      this.purgeTimer.unref?.();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }

  /** 완료 잡 TTL 정리(삭제 건수 로깅). */
  private purge(): void {
    const removed = this.queue.purgeFinished(Date.now() - this.ttlMs);
    if (removed > 0) {
      logger.info({ removed }, "완료 잡 TTL 정리");
    }
  }

  private async poll(): Promise<void> {
    while (this.inFlight < this.concurrency) {
      const job = this.queue.claimNext();
      if (!job) return;
      this.inFlight++;
      void this.run(job).finally(() => {
        this.inFlight--;
      });
    }
  }

  private async run(job: JobRecord): Promise<void> {
    const log = logger.child({ jobId: job.id, type: job.type });
    const handler = this.handlers[job.type];
    if (!handler) {
      log.error("등록된 핸들러 없음");
      this.queue.fail(job.id, `핸들러 없음: ${job.type}`);
      return;
    }
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`작업 타임아웃 (${this.timeoutMs / 1000}s)`)),
        this.timeoutMs,
      );
      timer.unref?.();
    });
    try {
      const result = await Promise.race([
        handler(job, { setProgress: (p) => this.queue.setProgress(job.id, p) }),
        timeout,
      ]);
      this.queue.complete(job.id, result ?? null);
      log.info("작업 완료");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error({ err }, "작업 실패");
      this.queue.fail(job.id, message);
    } finally {
      clearTimeout(timer);
    }
  }
}
