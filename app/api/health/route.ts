import { engines } from "@/lib/config";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 헬스 체크: DB 연결 + 현재 활성 엔진을 보고한다. */
export async function GET() {
  let dbOk = true;
  try {
    getDb().run(sql`select 1`);
  } catch {
    dbOk = false;
  }

  return Response.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "ok" : "error",
      engines,
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}
