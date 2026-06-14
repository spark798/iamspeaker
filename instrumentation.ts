/**
 * Next.js 런타임 시작 훅 (Node 런타임 전용).
 * 1) 마이그레이션을 적용해 DB 스키마를 보장(클론 후 바로 동작 — 수동 db:migrate 불필요, 멱등).
 * 2) 인프로세스 워커를 시작(크래시 복구 포함).
 * 초기화 실패가 서버 전체를 죽이지 않도록 격리한다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const { getDb } = await import("@/lib/db");
    const { startAppWorker } = await import("@/lib/jobs");

    migrate(getDb(), { migrationsFolder: "./lib/db/migrations" });
    startAppWorker();
  } catch (err) {
    console.error("[instrumentation] 초기화 실패 (워커/마이그레이션):", err);
  }
}
