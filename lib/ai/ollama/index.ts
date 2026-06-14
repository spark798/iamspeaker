import { randomUUID } from "node:crypto";
import {
  critiqueSlidesPrompt,
  evaluateAnswerPrompt,
  generateQuestionsPrompt,
  generateScriptPrompt,
  improveScriptPrompt,
} from "@/lib/ai/prompts";
import type {
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
} from "@/lib/ai/types";
import type {
  AnalysisResult,
  GenOptions,
  L1Profile,
  QAFeedback,
  QAItem,
  Script,
  ScriptDiff,
  SlideContent,
  SlideCritique,
  SlideScript,
  TranscriptResult,
} from "@/lib/domain";
import { ollamaChatJson } from "./client";

/** Ollama 구조화 출력 스키마 — 스크립트 형태를 강제. */
const SCRIPT_FORMAT = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: { slideIndex: { type: "integer" }, text: { type: "string" } },
        required: ["slideIndex", "text"],
      },
    },
  },
  required: ["slides"],
} as const;

/**
 * LLM이 반환한 세그먼트를 입력 슬라이드에 1:1로 정렬한다(결정적 보장).
 * - slideIndex가 일치하는 첫 세그먼트를 사용(중복은 첫 것)
 * - 없으면 위치(positional) 폴백, 그래도 없으면 빈 문자열
 * - 항상 입력 슬라이드 수만큼, 올바른 slideIndex로 반환(여분 세그먼트는 버림)
 */
export function alignSegmentsToSlides(
  slides: SlideContent[],
  segments: { slideIndex: number; text: string }[],
): SlideScript[] {
  const byIndex = new Map<number, string>();
  for (const seg of segments) {
    if (!byIndex.has(seg.slideIndex)) byIndex.set(seg.slideIndex, seg.text);
  }
  return slides.map((slide, i) => {
    const exact = byIndex.get(slide.index);
    const text = exact ?? segments[i]?.text ?? "";
    return { slideIndex: slide.index, text };
  });
}
import {
  AnswerEvalSchema,
  CritiqueSchema,
  QuestionsSchema,
  ScriptContentSchema,
  ScriptDiffSchema,
} from "./schemas";

/**
 * 로컬 Ollama 기반 LLM 어댑터(기본 엔진). 프롬프트는 lib/ai/prompts, 출력은 Zod로 검증.
 * (Phase 2: ANTHROPIC/OPENAI 키가 있으면 factory가 클라우드 구현으로 교체)
 */
export class OllamaScriptGenerator implements ScriptGeneratorAdapter {
  async generate(slides: SlideContent[], options: GenOptions): Promise<Script> {
    const { system, prompt } = generateScriptPrompt(slides, options);
    const parsed = ScriptContentSchema.parse(
      await ollamaChatJson({ system, prompt, format: SCRIPT_FORMAT }),
    );
    // 모델이 인트로/결론 등 여분을 추가하거나 누락해도 입력 슬라이드에 1:1 정렬(결정적).
    return { version: 0, source: "ai_demo", content: alignSegmentsToSlides(slides, parsed.slides) };
  }

  async improve(script: Script, analysis: AnalysisResult, l1?: L1Profile): Promise<ScriptDiff> {
    const { system, prompt } = improveScriptPrompt(script, analysis, l1);
    const parsed = ScriptDiffSchema.parse(await ollamaChatJson({ system, prompt }));
    return { baseVersion: script.version, entries: parsed.entries };
  }
}

export class OllamaSlideCritic implements SlideCriticAdapter {
  async analyze(slides: SlideContent[], targetDurationSec: number): Promise<SlideCritique[]> {
    const { system, prompt } = critiqueSlidesPrompt(slides, targetDurationSec);
    return CritiqueSchema.parse(await ollamaChatJson({ system, prompt })).critiques;
  }
}

export class OllamaQaGenerator implements QaGeneratorAdapter {
  async generateQuestions(
    slides: SlideContent[],
    script: Script,
    count: number,
  ): Promise<QAItem[]> {
    const { system, prompt } = generateQuestionsPrompt(slides, script, count);
    const parsed = QuestionsSchema.parse(await ollamaChatJson({ system, prompt }));
    return parsed.questions.slice(0, count).map((q) => ({ id: randomUUID(), ...q }));
  }

  async evaluateAnswer(question: QAItem, answerTranscript: TranscriptResult): Promise<QAFeedback> {
    const { system, prompt } = evaluateAnswerPrompt(question, answerTranscript.text);
    const parsed = AnswerEvalSchema.parse(await ollamaChatJson({ system, prompt }));
    const minutes = answerTranscript.durationSec / 60;
    const wpm = minutes > 0 ? Math.round(answerTranscript.words.length / minutes) : 0;
    return {
      questionId: question.id,
      wpm,
      fillerWords: [],
      relevanceScore: parsed.relevanceScore,
      improvedAnswer: parsed.improvedAnswer,
    };
  }
}
