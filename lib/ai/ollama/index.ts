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
  TranscriptResult,
} from "@/lib/domain";
import { ollamaChatJson } from "./client";
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
    const parsed = ScriptContentSchema.parse(await ollamaChatJson({ system, prompt }));
    return {
      version: 0,
      source: "ai_demo",
      content: parsed.slides.map((s) => ({ slideIndex: s.slideIndex, text: s.text })),
    };
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
