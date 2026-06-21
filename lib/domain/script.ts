export type Tone = "formal" | "casual";

/** 스크립트 출처: 0=AI 데모, 사용자 작성, AI 개선본. */
export type ScriptSource = "ai_demo" | "user" | "ai_improved";

/** 슬라이드 한 장에 대한 발표 스크립트. */
export interface SlideScript {
  slideIndex: number;
  text: string;
}

/** 발표 스크립트 한 버전. version 0 = AI 데모, 1+ = 사용자/개선본. */
export interface Script {
  version: number;
  source: ScriptSource;
  content: SlideScript[];
}

/** 스크립트 생성 옵션 (SCR-01 업로드 설정). */
export interface GenOptions {
  targetDurationSec: number;
  tone: Tone;
  /** 발표 언어 (기본 'en'). */
  language: string;
  /** 사용자 모국어 — L1 Profile 매칭 (예: 'ko'). */
  nativeLanguage?: string;
  /** 자가개선 루프(B-001 활용2)의 분량 보정 지시. expand=더 길게, condense=더 짧게. */
  lengthBias?: "expand" | "condense";
}

/** 개선 제안의 슬라이드별 항목 (SCR-06 diff 뷰). */
export interface ScriptDiffEntry {
  slideIndex: number;
  original: string;
  improved: string;
  /** 개선 이유 (예: "더 자연스러운 표현", "발음하기 쉬운 단어"). */
  reason: string;
}

/** 원본 대비 개선 스크립트 비교 (Diff/Improve 출력). */
export interface ScriptDiff {
  baseVersion: number;
  entries: ScriptDiffEntry[];
}
