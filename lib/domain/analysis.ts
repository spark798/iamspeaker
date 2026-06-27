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
  /** 그 슬라이드 구간에서 발화한 단어 수(슬라이드별 WPM 산출용). 구버전 기록엔 없을 수 있음. */
  wordCount?: number;
}

/** 처방적 코칭 신호 — 어느 슬라이드에서 무엇을 고칠지(서술적 지표를 행동으로). */
export interface Cue {
  /** 슬라이드 인덱스. 덱 전체 신호(monotone·risk)는 -1. */
  slideIndex: number;
  kind: "pace_fast" | "pace_slow" | "time_long" | "time_short" | "filler" | "monotone" | "risk";
  /** i18n 보간용 값(슬라이드별 wpm·필러 수, monotone=WPM 범위, risk=위험표현 수 등). */
  value?: number;
  /** 보조 텍스트(risk: 검출된 위험 표현 예시 "I think, maybe"). i18n 보간용. */
  text?: string;
}

/** 단어 사용 적합성 위험 표현의 범주. */
export type RiskCategory = "hedge" | "vague" | "apology";

/** 신뢰도를 낮추는 위험 표현(hedging/모호어/사과) 집계 1건. */
export interface RiskExpressionResult {
  /** 정규화 라벨("i think", "maybe"). */
  label: string;
  category: RiskCategory;
  /** 코칭 힌트 키(claim/evidence/precise/specific/quantify/own). */
  hint: string;
  count: number;
}

/** 단어 내 음소 1개의 발음 정확도(GOP). */
export interface PhonemeScore {
  /** IPA 음소(espeak). */
  ph: string;
  /** 정확히 발음됐는가(GOP 강제정렬·decode-compare 기준). */
  ok: boolean;
}

/** 발음 교정 대상 단어. */
export interface PronunciationIssue {
  word: string;
  expectedSound: string;
  confidence: number;
  timestamp: number;
  /** 사용자 L1Profile 규칙에 매칭되는 이슈인지 (UI 강조용). */
  l1Related: boolean;
  /** 음소별 정확도(wav2vec2 GOP 경로만; 휴리스틱은 없음). UI 적/녹 분해용. */
  phonemes?: PhonemeScore[];
}

/** 녹음 1건의 분석 결과 (SCR-05 리포트). */
export interface AnalysisResult {
  wpm: number;
  fillerWords: FillerWordResult[];
  slideTimeBreakdown: SlideTimeBreakdown[];
  pronunciationIssues: PronunciationIssue[];
  /** 단어 사이 묵음 구간(임계 이상) 개수 — 페이싱 메트릭(B-001). */
  pauseCount: number;
  /** 신뢰도를 낮추는 위험 표현(hedging/모호어/사과). 필러와 별개 축. */
  riskExpressions: RiskExpressionResult[];
}
