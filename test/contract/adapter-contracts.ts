import type {
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  SttAdapter,
  TtsAdapter,
} from "@/lib/ai/types";
import type { AnalysisResult, GenOptions, QAItem, Script, TranscriptResult } from "@/lib/domain";
import { describe, expect, it } from "vitest";

/**
 * 어댑터 계약 테스트 — 재사용 스위트.
 * stub/로컬/클라우드 어떤 구현이든 동일 인터페이스 계약(출력 스키마·필수 필드)을 통과해야 한다.
 * Phase 1 실제 구현도 이 스위트를 그대로 재사용한다.
 */

const SLIDES = [
  { index: 0, textContent: "Problem: churn is high", notes: null },
  { index: 1, textContent: "Solution: predictive ML", notes: "emphasize ROI" },
];
const OPTIONS: GenOptions = {
  targetDurationSec: 300,
  tone: "formal",
  language: "en",
  nativeLanguage: "ko",
};
const ANALYSIS: AnalysisResult = {
  wpm: 160,
  fillerWords: [],
  slideTimeBreakdown: [],
  pronunciationIssues: [],
};
const TRANSCRIPT: TranscriptResult = {
  text: "our solution reduces churn",
  words: [{ word: "our", startSec: 0, endSec: 0.3, confidence: 0.9 }],
  durationSec: 1.5,
};

/** 로컬 LLM은 5s 기본 타임아웃을 넘길 수 있어, live 스위트는 넉넉한 timeoutMs를 넘긴다(stub은 미지정 → 기본값). */
export function runScriptGeneratorContract(
  name: string,
  make: () => ScriptGeneratorAdapter,
  timeoutMs?: number,
) {
  describe(`ScriptGeneratorAdapter 계약: ${name}`, () => {
    it(
      "generate: 슬라이드 수만큼 ai_demo(v0) 스크립트",
      async () => {
        const s = await make().generate(SLIDES, OPTIONS);
        expect(s.version).toBe(0);
        expect(s.source).toBe("ai_demo");
        expect(s.content).toHaveLength(SLIDES.length);
        s.content.forEach((c, i) => {
          expect(c.slideIndex).toBe(i);
          expect(c.text.length).toBeGreaterThan(0);
        });
      },
      timeoutMs,
    );

    it(
      "improve: baseVersion 일치 + 항목별 사유 존재",
      async () => {
        const adapter = make();
        const base = await adapter.generate(SLIDES, OPTIONS);
        const diff = await adapter.improve(base, ANALYSIS);
        expect(diff.baseVersion).toBe(base.version);
        expect(diff.entries.length).toBeGreaterThan(0);
        for (const e of diff.entries) {
          expect(e.reason.length).toBeGreaterThan(0);
        }
      },
      timeoutMs,
    );
  });
}

export function runTtsContract(name: string, make: () => TtsAdapter) {
  describe(`TtsAdapter 계약: ${name}`, () => {
    it("synthesize: 비어있지 않은 오디오 + format", async () => {
      const r = await make().synthesize("Hello investors", "en");
      expect(r.audio.byteLength).toBeGreaterThan(0);
      expect(typeof r.format).toBe("string");
    });
  });
}

export function runSttContract(name: string, make: () => SttAdapter) {
  describe(`SttAdapter 계약: ${name}`, () => {
    it("transcribe: 텍스트 + 단어 타임스탬프(start<=end, confidence 0..1)", async () => {
      const r = await make().transcribe({ wavFilePath: "stub.wav" });
      expect(typeof r.text).toBe("string");
      expect(r.durationSec).toBeGreaterThanOrEqual(0);
      for (const w of r.words) {
        expect(w.startSec).toBeLessThanOrEqual(w.endSec);
        expect(w.confidence).toBeGreaterThanOrEqual(0);
        expect(w.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
}

export function runQaContract(name: string, make: () => QaGeneratorAdapter, timeoutMs?: number) {
  describe(`QaGeneratorAdapter 계약: ${name}`, () => {
    const script: Script = {
      version: 0,
      source: "ai_demo",
      content: [{ slideIndex: 0, text: "demo" }],
    };

    it(
      "generateQuestions: count개, 유효 difficulty/category",
      async () => {
        const items = await make().generateQuestions(SLIDES, script, 4);
        expect(items).toHaveLength(4);
        for (const q of items) {
          expect(["easy", "tough"]).toContain(q.difficulty);
          expect(["clarification", "challenge", "detail", "numbers"]).toContain(q.category);
          expect(q.question.length).toBeGreaterThan(0);
        }
      },
      timeoutMs,
    );

    it(
      "evaluateAnswer: questionId 일치, relevance 0..1, wpm>=0",
      async () => {
        const q: QAItem = {
          id: "q-test",
          question: "How do you reach $1M ARR?",
          relatedSlideIndex: 1,
          difficulty: "tough",
          category: "numbers",
        };
        const fb = await make().evaluateAnswer(q, TRANSCRIPT);
        expect(fb.questionId).toBe(q.id);
        expect(fb.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(fb.relevanceScore).toBeLessThanOrEqual(1);
        expect(fb.wpm).toBeGreaterThanOrEqual(0);
      },
      timeoutMs,
    );
  });
}

export function runSlideCriticContract(
  name: string,
  make: () => SlideCriticAdapter,
  timeoutMs?: number,
) {
  describe(`SlideCriticAdapter 계약: ${name}`, () => {
    it(
      "analyze: 슬라이드 수만큼, 유효 textDensity + readTime>=0",
      async () => {
        const out = await make().analyze(SLIDES, 300);
        expect(out).toHaveLength(SLIDES.length);
        for (const c of out) {
          expect(["low", "medium", "high"]).toContain(c.textDensity);
          expect(c.estimatedReadTimeSec).toBeGreaterThanOrEqual(0);
        }
      },
      timeoutMs,
    );
  });
}
