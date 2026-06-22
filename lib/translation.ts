import { randomUUID } from "node:crypto";
import { getAdapters } from "@/lib/ai/factory";
import type { Db } from "@/lib/db/client";
import { scriptTranslations, scripts, sessions } from "@/lib/db/schema";
import type { SlideScript } from "@/lib/domain";
import { and, desc, eq } from "drizzle-orm";

export interface ScriptTranslation {
  language: string;
  content: SlideScript[];
}

export interface ScriptWithTranslation {
  script: SlideScript[];
  /** 모국어가 발표 언어와 다를 때만 채워짐(자막 병기·SRT용). 아니면 null. */
  translation: ScriptTranslation | null;
}

/**
 * 세션의 최신 스크립트 + (모국어≠발표언어면) 번역을 반환. 번역은 scriptTranslations에
 * 캐시(scriptId+language)하고 재사용. 세션/스크립트 없으면 null.
 * 번역 라우트·SRT 라우트 공용 — 중복 제거.
 */
export async function loadScriptWithTranslation(
  db: Db,
  sessionId: string,
): Promise<ScriptWithTranslation | null> {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return null;

  const scriptRow = db
    .select()
    .from(scripts)
    .where(eq(scripts.sessionId, sessionId))
    .orderBy(desc(scripts.version))
    .get();
  if (!scriptRow) return null;

  const target = session.nativeLanguage;
  if (!target || target === session.language) {
    return { script: scriptRow.content, translation: null };
  }

  const cached = db
    .select()
    .from(scriptTranslations)
    .where(
      and(eq(scriptTranslations.scriptId, scriptRow.id), eq(scriptTranslations.language, target)),
    )
    .get();
  if (cached) {
    return {
      script: scriptRow.content,
      translation: { language: target, content: cached.content },
    };
  }

  const texts = scriptRow.content.map((c) => c.text);
  const translated = await getAdapters().translator.translate(texts, target, session.language);
  const content = scriptRow.content.map((c, i) => ({
    slideIndex: c.slideIndex,
    text: translated[i] ?? c.text,
  }));
  // 동시 요청 경쟁 시 unique(scriptId,language) 충돌은 무시.
  db.insert(scriptTranslations)
    .values({ id: randomUUID(), scriptId: scriptRow.id, language: target, content })
    .onConflictDoNothing()
    .run();

  return { script: scriptRow.content, translation: { language: target, content } };
}
