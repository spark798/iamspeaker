/** 슬라이드 본문/구조 (Slide Parser 출력, 스크립트 생성·분석의 입력). */
export interface SlideContent {
  index: number;
  textContent: string;
  notes: string | null;
}

export type TextDensity = "low" | "medium" | "high";

/** 슬라이드 자체에 대한 비평 (Slide Critic 출력 — SCR-01b). */
export interface SlideCritique {
  slideIndex: number;
  textDensity: TextDensity;
  estimatedReadTimeSec: number;
  issues: string[];
  suggestions: string[];
}
