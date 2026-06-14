/**
 * Next.js 런타임 시작 훅. Node 런타임에서만 인프로세스 워커를 시작한다(크래시 복구 포함).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAppWorker } = await import("@/lib/jobs");
    startAppWorker();
  }
}
