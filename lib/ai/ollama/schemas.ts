import { z } from "zod";

/** LLM(Ollama) 출력 검증 스키마 — 미신뢰 경계. 숫자는 coerce로 견고하게. */

export const ScriptContentSchema = z.object({
  slides: z
    .array(z.object({ slideIndex: z.coerce.number().int(), text: z.string().min(1) }))
    .min(1),
});

export const ScriptDiffSchema = z.object({
  entries: z.array(
    z.object({
      slideIndex: z.coerce.number().int(),
      original: z.string(),
      improved: z.string(),
      reason: z.string(),
    }),
  ),
});

export const CritiqueSchema = z.object({
  critiques: z.array(
    z.object({
      slideIndex: z.coerce.number().int(),
      textDensity: z.enum(["low", "medium", "high"]),
      estimatedReadTimeSec: z.coerce.number().nonnegative(),
      issues: z.array(z.string()).default([]),
      suggestions: z.array(z.string()).default([]),
    }),
  ),
});

export const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().min(1),
      relatedSlideIndex: z.coerce.number().int(),
      difficulty: z.enum(["easy", "tough"]),
      category: z.enum(["clarification", "challenge", "detail", "numbers"]),
    }),
  ),
});

export const AnswerEvalSchema = z.object({
  relevanceScore: z.coerce.number().min(0).max(1),
  improvedAnswer: z.string().optional(),
});

export const TranslationSchema = z.object({
  items: z.array(z.object({ i: z.coerce.number().int(), text: z.string() })),
});
