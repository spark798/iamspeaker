/**
 * 마이그레이션 적용 스크립트. 실행: `pnpm db:migrate`
 * (스키마 변경 시 먼저 `pnpm db:generate`로 SQL을 생성·커밋한 뒤 적용)
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값
}

const { config } = await import("../config");
const { createDb, resolveDbFile } = await import("./client");

const db = createDb(resolveDbFile(config.DATABASE_URL));
migrate(db, { migrationsFolder: "./lib/db/migrations" });
console.log("✅ 마이그레이션 적용 완료:", resolveDbFile(config.DATABASE_URL));
