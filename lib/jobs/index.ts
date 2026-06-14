import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { JobQueue } from "./queue";
import { type JobHandlers, Worker } from "./worker";

export * from "./queue";
export * from "./worker";

/** 앱 핸들러 레지스트리. Phase 1에서 parse/demo/critique/analyze/improve/qa_* 핸들러 등록. */
const handlers: JobHandlers = {};

let appQueue: JobQueue | undefined;
let appWorker: Worker | undefined;

export function getQueue(): JobQueue {
  if (!appQueue) {
    appQueue = new JobQueue(getDb());
  }
  return appQueue;
}

/** 앱 워커를 1회 시작(크래시 복구 포함). instrumentation에서 호출. */
export function startAppWorker(): Worker {
  if (!appWorker) {
    appWorker = new Worker(getQueue(), handlers, { concurrency: config.JOB_CONCURRENCY });
    appWorker.start();
  }
  return appWorker;
}
