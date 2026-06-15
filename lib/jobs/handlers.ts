import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Adapters } from "@/lib/ai/types";
import type { Db } from "@/lib/db/client";
import { qaItems, qaSessions, scripts, sessions, slideCritiques, slides } from "@/lib/db/schema";
import type { SlideContent } from "@/lib/domain";
import { parseSlides } from "@/lib/slides";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { JobHandlers } from "./worker";

const SessionPayload = z.object({ sessionId: z.string().min(1) });
const ParsePayload = z.object({ sessionId: z.string().min(1), filePath: z.string().min(1) });
const QaPayload = z.object({
  sessionId: z.string().min(1),
  count: z.number().int().positive().optional(),
});

/**
 * 작업 핸들러 — 어댑터(stub/실제)와 DB를 주입받는다(테스트 시 in-memory db + stub 주입).
 * 어댑터 호출은 factory 경유로 받은 것만 사용(직접 호출 금지).
 */
export function createHandlers(db: Db, adapters: Adapters): JobHandlers {
  const loadSlides = (sessionId: string): SlideContent[] =>
    db
      .select()
      .from(slides)
      .where(eq(slides.sessionId, sessionId))
      .orderBy(asc(slides.slideIndex))
      .all()
      .map((r) => ({ index: r.slideIndex, textContent: r.textContent, notes: r.notes }));

  const requireSession = (sessionId: string) => {
    const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session) throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    return session;
  };

  return {
    // 업로드 파일(PPTX/PDF) → 슬라이드 본문/노트 추출·저장
    parse: async (job, ctx) => {
      const { sessionId, filePath } = ParsePayload.parse(job.payload);
      requireSession(sessionId);
      ctx.setProgress(20);
      const bytes = new Uint8Array(readFileSync(filePath));
      const parsed = await parseSlides(filePath, bytes);
      if (parsed.length === 0) throw new Error("슬라이드를 추출하지 못했습니다");
      ctx.setProgress(70);
      db.delete(slides).where(eq(slides.sessionId, sessionId)).run();
      for (const s of parsed) {
        db.insert(slides)
          .values({
            id: randomUUID(),
            sessionId,
            slideIndex: s.index,
            textContent: s.textContent,
            notes: s.notes,
          })
          .run();
      }
      db.update(sessions).set({ slideFilePath: filePath }).where(eq(sessions.id, sessionId)).run();
      return { slides: parsed.length };
    },

    // 슬라이드 → AI 데모 스크립트(version 0) 생성·저장
    demo: async (job, ctx) => {
      const { sessionId } = SessionPayload.parse(job.payload);
      const session = requireSession(sessionId);
      const slideContents = loadSlides(sessionId);
      if (slideContents.length === 0)
        throw new Error("슬라이드가 없습니다. 먼저 업로드/파싱하세요.");
      ctx.setProgress(20);
      const script = await adapters.script.generate(slideContents, {
        targetDurationSec: session.targetDurationSec,
        tone: session.tone,
        language: session.language,
        nativeLanguage: session.nativeLanguage ?? undefined,
      });
      ctx.setProgress(80);
      const scriptId = randomUUID();
      db.insert(scripts)
        .values({
          id: scriptId,
          sessionId,
          version: script.version,
          source: script.source,
          content: script.content,
        })
        .run();
      return { scriptId, slides: script.content.length };
    },

    // 슬라이드 자체 비평 생성·저장
    critique: async (job, ctx) => {
      const { sessionId } = SessionPayload.parse(job.payload);
      const session = requireSession(sessionId);
      ctx.setProgress(30);
      const critiques = await adapters.slideCritic.analyze(
        loadSlides(sessionId),
        session.targetDurationSec,
      );
      ctx.setProgress(80);
      db.delete(slideCritiques).where(eq(slideCritiques.sessionId, sessionId)).run();
      for (const c of critiques) {
        db.insert(slideCritiques)
          .values({
            id: randomUUID(),
            sessionId,
            slideIndex: c.slideIndex,
            textDensity: c.textDensity,
            estimatedReadTimeSec: c.estimatedReadTimeSec,
            issues: c.issues,
            suggestions: c.suggestions,
          })
          .run();
      }
      return { count: critiques.length };
    },

    // 슬라이드 + 최신 스크립트 → 예상 질문 생성·저장
    qa_generate: async (job, ctx) => {
      const { sessionId, count } = QaPayload.parse(job.payload);
      requireSession(sessionId);
      const scriptRow = db
        .select()
        .from(scripts)
        .where(eq(scripts.sessionId, sessionId))
        .orderBy(desc(scripts.version))
        .get();
      if (!scriptRow) throw new Error("스크립트가 없습니다. 먼저 데모/편집을 진행하세요.");
      ctx.setProgress(30);
      const items = await adapters.qa.generateQuestions(
        loadSlides(sessionId),
        { version: scriptRow.version, source: scriptRow.source, content: scriptRow.content },
        count ?? 4,
      );
      ctx.setProgress(80);
      const qaSessionId = randomUUID();
      db.insert(qaSessions).values({ id: qaSessionId, sessionId }).run();
      for (const item of items) {
        db.insert(qaItems)
          .values({
            id: randomUUID(),
            qaSessionId,
            question: item.question,
            relatedSlideIndex: item.relatedSlideIndex,
            difficulty: item.difficulty,
            category: item.category,
          })
          .run();
      }
      return { qaSessionId, count: items.length };
    },
  };
}
