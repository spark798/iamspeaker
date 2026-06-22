import { randomUUID } from "node:crypto";
import {
  AnswerEvalSchema,
  CritiqueSchema,
  QuestionsSchema,
  ScriptContentSchema,
  ScriptDiffSchema,
  TranslationSchema,
} from "@/lib/ai/ollama/schemas";
import {
  critiqueSlidesPrompt,
  evaluateAnswerPrompt,
  generateQuestionsPrompt,
  generateScriptPrompt,
  improveScriptPrompt,
  translatePrompt,
} from "@/lib/ai/prompts";
import type {
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  TranslatorAdapter,
} from "@/lib/ai/types";
import { ruleBasedCritique } from "@/lib/analysis/critique";
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
import type { ChatJson } from "./client";

/** Ollama 구조화 출력 스키마(다른 provider는 무시) — 스크립트 형태 강제. */
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
 * slideIndex 일치 우선 → 위치 폴백 → 빈 문자열. 항상 입력 슬라이드 수만큼 반환.
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

/**
 * provider-무관 LLM 어댑터. 프롬프트(lib/ai/prompts)·검증(Zod)·정렬은 공유하고,
 * 실제 호출만 주입된 ChatJson(ollama/claude/openai)이 담당한다.
 */
export class LlmScriptGenerator implements ScriptGeneratorAdapter {
  constructor(private readonly chat: ChatJson) {}

  async generate(slides: SlideContent[], options: GenOptions): Promise<Script> {
    const { system, prompt } = generateScriptPrompt(slides, options);
    const parsed = ScriptContentSchema.parse(
      await this.chat({ system, prompt, format: SCRIPT_FORMAT }),
    );
    return { version: 0, source: "ai_demo", content: alignSegmentsToSlides(slides, parsed.slides) };
  }

  async improve(script: Script, analysis: AnalysisResult, l1?: L1Profile): Promise<ScriptDiff> {
    const { system, prompt } = improveScriptPrompt(script, analysis, l1);
    const parsed = ScriptDiffSchema.parse(await this.chat({ system, prompt }));
    return { baseVersion: script.version, entries: parsed.entries };
  }
}

export class LlmSlideCritic implements SlideCriticAdapter {
  constructor(private readonly chat: ChatJson) {}

  async analyze(slides: SlideContent[], targetDurationSec: number): Promise<SlideCritique[]> {
    // 규칙 기반 1차(LLM 없이도 동작). LLM 성공 시 자연어 피드백으로 대체, 실패 시 폴백.
    const baseline = ruleBasedCritique(slides, targetDurationSec);
    try {
      const { system, prompt } = critiqueSlidesPrompt(slides, targetDurationSec);
      const parsed = CritiqueSchema.parse(await this.chat({ system, prompt }));
      const byIndex = new Map(parsed.critiques.map((c) => [c.slideIndex, c]));
      return baseline.map((b) => byIndex.get(b.slideIndex) ?? b);
    } catch {
      return baseline;
    }
  }
}

export class LlmQaGenerator implements QaGeneratorAdapter {
  constructor(private readonly chat: ChatJson) {}

  async generateQuestions(
    slides: SlideContent[],
    script: Script,
    count: number,
  ): Promise<QAItem[]> {
    const { system, prompt } = generateQuestionsPrompt(slides, script, count);
    const parsed = QuestionsSchema.parse(await this.chat({ system, prompt }));
    return parsed.questions.slice(0, count).map((q) => ({ id: randomUUID(), ...q }));
  }

  async evaluateAnswer(question: QAItem, answerTranscript: TranscriptResult): Promise<QAFeedback> {
    const { system, prompt } = evaluateAnswerPrompt(question, answerTranscript.text);
    const parsed = AnswerEvalSchema.parse(await this.chat({ system, prompt }));
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

export class LlmTranslator implements TranslatorAdapter {
  constructor(private readonly chat: ChatJson) {}

  async translate(texts: string[], targetLang: string, sourceLang: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const { system, prompt } = translatePrompt(texts, targetLang, sourceLang);
    const parsed = TranslationSchema.parse(await this.chat({ system, prompt }));
    const byIndex = new Map(parsed.items.map((it) => [it.i, it.text]));
    return texts.map((original, i) => byIndex.get(i) ?? original);
  }
}
