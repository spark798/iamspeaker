import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadL1Profile } from "@/lib/ai/l1-profiles";
import { generateWithRefinement } from "@/lib/ai/refine";
import type { Adapters } from "@/lib/ai/types";
import { loadBaseline } from "@/lib/analysis/baselines";
import { generateCues } from "@/lib/analysis/cues";
import { pronunciationScore } from "@/lib/analysis/pronunciation";
import { analyzeSpeech } from "@/lib/analysis/speech";
import { countSilences, normalizeToWav, readWavDurationSec } from "@/lib/audio";
import type { Db } from "@/lib/db/client";
import {
  analysisResults,
  qaAnswers,
  qaItems,
  qaSessions,
  recordings,
  scripts,
  sessions,
  slideCritiques,
  slides,
} from "@/lib/db/schema";
import type { SlideContent } from "@/lib/domain";
import { logger } from "@/lib/logger";
import { parseSlides } from "@/lib/slides";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { JobHandlers } from "./worker";

const SessionPayload = z.object({ sessionId: z.string().min(1) });
const ParsePayload = z.object({ sessionId: z.string().min(1), filePath: z.string().min(1) });
const AnalyzePayload = z.object({ recordingId: z.string().min(1) });
const ImprovePayload = z.object({ recordingId: z.string().min(1) });
const QaEvaluatePayload = z.object({
  qaItemId: z.string().min(1),
  audioFilePath: z.string().min(1),
});
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
      // 자가개선 루프(B-001 활용2): 생성 → 분량 자가 채점 → 부족하면 1회 보정 재생성.
      const { script } = await generateWithRefinement(
        adapters.script,
        slideContents,
        {
          targetDurationSec: session.targetDurationSec,
          tone: session.tone,
          language: session.language,
          nativeLanguage: session.nativeLanguage ?? undefined,
        },
        loadBaseline(session.genre),
      );
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

    // 녹음 → 정규화 → STT → 분석(WPM/필러/시간배분) → 저장
    analyze: async (job, ctx) => {
      const { recordingId } = AnalyzePayload.parse(job.payload);
      const rec = db.select().from(recordings).where(eq(recordings.id, recordingId)).get();
      if (!rec) throw new Error(`녹음을 찾을 수 없습니다: ${recordingId}`);
      const session = requireSession(rec.sessionId);
      ctx.setProgress(15);

      const wavPath = `${rec.audioFilePath}.16k.wav`;
      await normalizeToWav(rec.audioFilePath, wavPath);
      const audioDurationSec = readWavDurationSec(wavPath);
      ctx.setProgress(40);

      const transcript = await adapters.stt.transcribe({ wavFilePath: wavPath });
      const pauseCount = await countSilences(wavPath);
      ctx.setProgress(70);

      // 발음 평가(스코어러 어댑터). wav2vec2 GOP는 대본을 참조로 강제정렬하므로 녹음한 버전의 스크립트를 전달.
      const l1Profile = loadL1Profile(session.nativeLanguage);
      const scriptRow = db
        .select()
        .from(scripts)
        .where(and(eq(scripts.sessionId, rec.sessionId), eq(scripts.version, rec.scriptVersion)))
        .get();
      const referenceText = scriptRow?.content.map((c) => c.text).join(" ");
      // 발음 스코어러 실패(모델/Python 등)는 분석 전체를 중단시키지 않도록 휴리스틱 폴백.
      let pronResult: Awaited<ReturnType<typeof adapters.pronunciation.detect>> | undefined;
      try {
        pronResult = await adapters.pronunciation.detect({
          wavFilePath: wavPath,
          words: transcript.words,
          referenceText,
          l1Profile,
        });
      } catch (err) {
        logger.warn({ err }, "발음 스코어러 실패 — 휴리스틱 폴백");
        pronResult = undefined; // analyzeSpeech가 휴리스틱으로 폴백
      }
      const pronunciationIssues = pronResult?.issues; // 없으면 analyzeSpeech 휴리스틱
      // 전체 발음 점수: 스코어러 점수 우선, 실패 시 STT confidence 대용.
      const pronScore =
        pronResult?.score ?? pronunciationScore(transcript.words.map((w) => w.confidence));
      ctx.setProgress(85);

      const result = analyzeSpeech({
        transcript,
        audioDurationSec,
        transitions: rec.transitions,
        language: session.language,
        l1Profile,
        pauseCount,
        pronunciationIssues,
      });

      db.delete(analysisResults).where(eq(analysisResults.recordingId, recordingId)).run();
      db.insert(analysisResults)
        .values({
          id: randomUUID(),
          recordingId,
          wpm: result.wpm,
          fillerWords: result.fillerWords,
          slideTimeBreakdown: result.slideTimeBreakdown,
          pronunciationIssues: result.pronunciationIssues,
          pronunciationScore: pronScore,
          pauseCount: result.pauseCount,
        })
        .run();
      db.update(recordings)
        .set({ durationSec: audioDurationSec })
        .where(eq(recordings.id, recordingId))
        .run();

      return { wpm: result.wpm, durationSec: audioDurationSec };
    },

    // 최신 스크립트 + 분석 결과 → 개선 제안(diff). 결과는 잡 result에 담김(SCR-06이 조회).
    improve: async (job, ctx) => {
      const { recordingId } = ImprovePayload.parse(job.payload);
      const rec = db.select().from(recordings).where(eq(recordings.id, recordingId)).get();
      if (!rec) throw new Error(`녹음을 찾을 수 없습니다: ${recordingId}`);
      const session = requireSession(rec.sessionId);
      const scriptRow = db
        .select()
        .from(scripts)
        .where(eq(scripts.sessionId, rec.sessionId))
        .orderBy(desc(scripts.version))
        .get();
      if (!scriptRow) throw new Error("스크립트가 없습니다. 먼저 데모/편집을 진행하세요.");
      const analysisRow = db
        .select()
        .from(analysisResults)
        .where(eq(analysisResults.recordingId, recordingId))
        .get();
      if (!analysisRow) throw new Error("분석 결과가 없습니다.");
      ctx.setProgress(30);
      // 모국어 기반 맞춤 교정(Epic 6): nativeLanguage → L1 프로필.
      const l1 = loadL1Profile(session.nativeLanguage);
      // 처방 cue를 개선에 주입(코치→개선 연결): 측정된 슬라이드별 약점을 직접 겨냥.
      const baseline = loadBaseline(session.genre);
      const nonNative = !!session.nativeLanguage && session.nativeLanguage !== session.language;
      const wpmSpec = baseline.metrics.wpm;
      const deckCount = db
        .select()
        .from(slides)
        .where(eq(slides.sessionId, rec.sessionId))
        .all().length;
      const cues = generateCues({
        breakdown: analysisRow.slideTimeBreakdown,
        transitions: rec.transitions,
        totalDurationSec: rec.durationSec,
        fillerWords: analysisRow.fillerWords,
        goalWpmMin:
          nonNative && wpmSpec?.nonNativeIdealMin !== undefined
            ? wpmSpec.nonNativeIdealMin
            : (wpmSpec?.idealMin ?? 110),
        goalWpmMax:
          nonNative && wpmSpec?.nonNativeIdealMax !== undefined
            ? wpmSpec.nonNativeIdealMax
            : (wpmSpec?.idealMax ?? 150),
        targetDurationSec: session.targetDurationSec,
        slideCount: deckCount,
      });
      const diff = await adapters.script.improve(
        { version: scriptRow.version, source: scriptRow.source, content: scriptRow.content },
        {
          wpm: analysisRow.wpm,
          fillerWords: analysisRow.fillerWords,
          slideTimeBreakdown: analysisRow.slideTimeBreakdown,
          pronunciationIssues: analysisRow.pronunciationIssues,
          pauseCount: analysisRow.pauseCount,
        },
        l1,
        cues,
      );
      ctx.setProgress(90);
      return diff;
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

    // Q&A 답변 녹음 → STT → 분석(WPM/필러) + LLM 평가(적합도/개선답변) → qa_answers 저장
    qa_evaluate: async (job, ctx) => {
      const { qaItemId, audioFilePath } = QaEvaluatePayload.parse(job.payload);
      const item = db.select().from(qaItems).where(eq(qaItems.id, qaItemId)).get();
      if (!item) throw new Error(`질문을 찾을 수 없습니다: ${qaItemId}`);
      const qs = db.select().from(qaSessions).where(eq(qaSessions.id, item.qaSessionId)).get();
      const language = qs ? requireSession(qs.sessionId).language : "en";
      ctx.setProgress(15);

      const wavPath = `${audioFilePath}.16k.wav`;
      await normalizeToWav(audioFilePath, wavPath);
      const audioDurationSec = readWavDurationSec(wavPath);
      ctx.setProgress(40);

      const transcript = await adapters.stt.transcribe({ wavFilePath: wavPath });
      const speech = analyzeSpeech({ transcript, audioDurationSec, transitions: [], language });
      ctx.setProgress(70);

      const feedback = await adapters.qa.evaluateAnswer(
        {
          id: item.id,
          question: item.question,
          relatedSlideIndex: item.relatedSlideIndex,
          difficulty: item.difficulty,
          category: item.category,
        },
        transcript,
      );
      ctx.setProgress(90);

      db.delete(qaAnswers).where(eq(qaAnswers.qaItemId, qaItemId)).run();
      db.insert(qaAnswers)
        .values({
          id: randomUUID(),
          qaItemId,
          audioFilePath,
          transcript: transcript.text,
          wpm: speech.wpm,
          fillerWords: speech.fillerWords,
          relevanceScore: feedback.relevanceScore,
          improvedAnswer: feedback.improvedAnswer ?? null,
        })
        .run();
      return { relevanceScore: feedback.relevanceScore, wpm: speech.wpm };
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
