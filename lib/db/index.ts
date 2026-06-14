import { config } from "@/lib/config";
import { type Db, createDb, resolveDbFile } from "./client";

export * from "./schema";
export { type Db, createDb, resolveDbFile } from "./client";

let _db: Db | undefined;

/** 앱 전역 DB 싱글턴(지연 초기화). 테스트는 createDb(":memory:")를 직접 사용. */
export function getDb(): Db {
  if (!_db) {
    _db = createDb(resolveDbFile(config.DATABASE_URL));
  }
  return _db;
}
