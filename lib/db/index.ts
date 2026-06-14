import { config } from "@/lib/config";
import { createDb, resolveDbFile } from "./client";

export * from "./schema";
export { createDb, resolveDbFile, type Db } from "./client";

/** 앱 전역 DB 싱글턴. (테스트는 createDb(":memory:")를 직접 사용) */
export const db = createDb(resolveDbFile(config.DATABASE_URL));
