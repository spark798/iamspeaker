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

export function getQueue(): JobQueue {
  if (!appQueue) {
    appQueue = new JobQueue(getDb());
  }
  return appQueue;
}

/** 앱 워커를 1회 시작(크래시 복구 포함). instrumentation에서 호출. */
export function startAppWorker(): Worker {
  if (!appWorker) {
    const handlers = createHandlers(getDb(), getAdapters());
    appWorker = new Worker(getQueue(), handlers, { concurrency: config.JOB_CONCURRENCY });
    appWorker.start();
  }
  return appWorker;
}
