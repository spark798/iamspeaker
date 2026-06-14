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
}

/**
 * 인프로세스 워커. 큐를 폴링해 concurrency 만큼 동시 처리한다.
 * 핸들러가 없거나 throw하면 작업을 failed로 기록(원본 에러는 로그).
 */
export class Worker {
  private inFlight = 0;
  private timer: NodeJS.Timeout | null = null;
  private readonly concurrency: number;
  private readonly pollMs: number;

  constructor(
    private readonly queue: JobQueue,
    private readonly handlers: JobHandlers,
    opts: WorkerOptions = {},
  ) {
    this.concurrency = Math.max(1, opts.concurrency ?? 1);
    this.pollMs = Math.max(50, opts.pollMs ?? 250);
  }

  /** 큐에서 1건을 꺼내 처리. 처리할 작업이 없으면 false. (테스트/수동 구동용) */
  async processOnce(): Promise<boolean> {
    const job = this.queue.claimNext();
    if (!job) return false;
    await this.run(job);
    return true;
  }

  /** 크래시 복구 후 폴링 루프를 시작한다. */
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
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
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
    try {
      const result = await handler(job, { setProgress: (p) => this.queue.setProgress(job.id, p) });
      this.queue.complete(job.id, result ?? null);
      log.info("작업 완료");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error({ err }, "작업 실패");
      this.queue.fail(job.id, message);
    }
  }
}
