import { config } from "@/lib/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Db, createDb, resolveDbFile } from "./client";

export * from "./schema";
export { type Db, createDb, resolveDbFile } from "./client";

let _db: Db | undefined;

/**
 * 앱 전역 DB 싱글턴(지연 초기화 + 시작 시 멱등 마이그레이션 → 클론 후 바로 동작).
 * 테스트는 createDb(":memory:")를 직접 사용(마이그레이션도 직접 적용).
 */
export function getDb(): Db {
  if (!_db) {
    _db = createDb(resolveDbFile(config.DATABASE_URL));
    migrate(_db, { migrationsFolder: "./lib/db/migrations" });
  }
  return _db;
}
