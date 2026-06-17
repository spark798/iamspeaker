import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
  // 부모 디렉토리 보장(better-sqlite3는 디렉토리를 만들지 않음 → 신규 환경에서 실패 방지).
  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
