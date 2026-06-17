import { getAdapters } from "@/lib/ai/factory";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { createHandlers } from "./handlers";
import { JobQueue } from "./queue";
import { Worker } from "./worker";

export * from "./queue";
export * from "./worker";
export { createHandlers } from "./handlers";

let appQueue: JobQueue | undefined;
let appWorker: Worker | undefined;

/**
 * 큐 + 인프로세스 워커를 지연 기동(첫 enqueue 시). 크래시 복구(running→queued)는 워커 start에서.
 * instrumentation 대신 이 방식을 쓴다(Next dev에서 네이티브 모듈 번들 이슈 회피).
 */
function ensureStarted(): JobQueue {
  if (appQueue) return appQueue;
  appQueue = new JobQueue(getDb());
  appWorker = new Worker(appQueue, createHandlers(getDb(), getAdapters()), {
    concurrency: config.JOB_CONCURRENCY,
    timeoutSec: config.JOB_TIMEOUT_SEC,
  });
  appWorker.start();
  return appQueue;
}

export function getQueue(): JobQueue {
  return ensureStarted();
}

/** 워커 중지(주로 graceful shutdown/테스트용). */
export function stopWorker(): void {
  appWorker?.stop();
  appWorker = undefined;
  appQueue = undefined;
}
