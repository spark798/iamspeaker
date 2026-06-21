import { randomUUID } from "node:crypto";
import { getAdapters } from "@/lib/ai/factory";
import { getDb } from "@/lib/db";
import { scriptTranslations, scripts, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * SCR-02 자막 병기: 최신 스크립트를 사용자 모국어로 번역(원문+번역 병기용).
 * 타깃 = session.nativeLanguage. 모국어가 없거나 발표 언어와 같으면 번역 불필요(204).
 * 결과는 script_translations에 캐시(scriptId+language)해 재사용.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");

    const target = session.nativeLanguage;
    if (!target || target === session.language) {
      return new Response(null, { status: 204 }); // 번역 불필요
    }

    const scriptRow = db
      .select()
      .from(scripts)
      .where(eq(scripts.sessionId, id))
      .orderBy(desc(scripts.version))
      .get();
    if (!scriptRow) throw Errors.notFound("스크립트가 아직 없습니다");

    const cached = db
      .select()
      .from(scriptTranslations)
      .where(
        and(eq(scriptTranslations.scriptId, scriptRow.id), eq(scriptTranslations.language, target)),
      )
      .get();
    if (cached) {
      return Response.json({ language: target, content: cached.content });
    }

    const texts = scriptRow.content.map((c) => c.text);
    const translated = await getAdapters().translator.translate(texts, target, session.language);
    const content = scriptRow.content.map((c, i) => ({
      slideIndex: c.slideIndex,
      text: translated[i] ?? c.text,
    }));

    // 동시 토글 경쟁 시 unique(scriptId,language) 충돌은 무시(이미 캐시됨).
    db.insert(scriptTranslations)
      .values({ id: randomUUID(), scriptId: scriptRow.id, language: target, content })
      .onConflictDoNothing()
      .run();

    return Response.json({ language: target, content });
  } catch (err) {
    return errorResponse(err);
  }
}
