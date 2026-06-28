import { analyzeVocabulary } from "@/lib/analysis/vocabulary";
import { getDb } from "@/lib/db";
import { scripts, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * SCR-03/05: 최신 스크립트의 어휘 수준 분석 — 청중이 어려울 수 있는 고급(C1/C2) 단어 + 쉬운 대안.
 * 발표 언어 기준(en). 저장 없이 요청 시 계산(마이그레이션 불필요).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");

    const scriptRow = db
      .select()
      .from(scripts)
      .where(eq(scripts.sessionId, id))
      .orderBy(desc(scripts.version))
      .get();
    if (!scriptRow) throw Errors.notFound("스크립트가 아직 없습니다");

    const words = scriptRow.content
      .map((s) => s.text)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
    const result = analyzeVocabulary(words, session.language);

    return Response.json({ version: scriptRow.version, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
