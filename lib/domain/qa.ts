import type { FillerWordResult } from "./transcript";

export type Difficulty = "easy" | "tough";

/** 'tough'는 약점을 파고드는 질문. */
export type QACategory = "clarification" | "challenge" | "detail" | "numbers";

/** 예상 질문 (Q&A Generator 출력 — SCR-08). */
export interface QAItem {
  id: string;
  question: string;
  relatedSlideIndex: number;
  difficulty: Difficulty;
  category: QACategory;
}

/** 답변 녹음 평가 결과. */
export interface QAFeedback {
  questionId: string;
  wpm: number;
  fillerWords: FillerWordResult[];
  /** 답변이 질문에 얼마나 부합하는지 0~1 (LLM 평가). */
  relevanceScore: number;
  improvedAnswer?: string;
}
