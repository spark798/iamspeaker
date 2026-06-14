import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/** `file:` 접두사를 제거해 better-sqlite3 파일 경로로 변환. */
export function resolveDbFile(databaseUrl: string): string {
  return databaseUrl.replace(/^file:/, "");
}

/** better-sqlite3 기반 drizzle 인스턴스를 만든다. 테스트는 ":memory:"로 호출. */
export function createDb(filename: string) {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
