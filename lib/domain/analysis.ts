import type { FillerWordResult } from "./transcript";

/** 녹음 중 슬라이드 전환 시점 (SCR-04에서 기록). */
export interface SlideTransition {
  slideIndex: number;
  atSec: number;
}

/** 슬라이드별 소요 시간 (슬라이드 전환 타임스탬프 × 발화 구간). */
export interface SlideTimeBreakdown {
  slideIndex: number;
  durationSec: number;
}

/** 발음 교정 대상 단어. */
export interface PronunciationIssue {
  word: string;
  expectedSound: string;
  confidence: number;
  timestamp: number;
  /** 사용자 L1Profile 규칙에 매칭되는 이슈인지 (UI 강조용). */
  l1Related: boolean;
}

/** 녹음 1건의 분석 결과 (SCR-05 리포트). */
export interface AnalysisResult {
  wpm: number;
  fillerWords: FillerWordResult[];
  slideTimeBreakdown: SlideTimeBreakdown[];
  pronunciationIssues: PronunciationIssue[];
}
