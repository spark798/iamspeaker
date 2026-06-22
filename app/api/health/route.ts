import { config, engines } from "@/lib/config";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 활성 LLM 엔진 도달 가능성. 로컬(ollama)은 핑, 클라우드는 키 존재로 판정(과금 호출 회피). */
async function llmReachable(): Promise<boolean> {
  if (engines.script === "claude") return !!config.ANTHROPIC_API_KEY;
  if (engines.script === "openai") return !!config.OPENAI_API_KEY;
  try {
    const res = await fetch(`${config.OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 헬스 체크: DB 연결 + 현재 활성 엔진 + LLM 도달 가능성을 보고한다. */
export async function GET() {
  let dbOk = true;
  try {
    getDb().run(sql`select 1`);
  } catch {
    dbOk = false;
  }
  const llmOk = await llmReachable();

  return Response.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "ok" : "error",
      engines,
      llm: { engine: engines.script, reachable: llmOk },
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}
