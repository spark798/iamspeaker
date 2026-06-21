import { scoreRange } from "@/lib/analysis/percentile";
import type { Baseline, ScoreBand, Script, SlideContent } from "@/lib/domain";
import { countWords } from "@/lib/script/estimate";

/** 생성 스크립트 1건의 품질 지표(순수, 결정적). 회귀 eval(B-001 활용3)·자가개선(활용2) 공용. */
export interface ScriptQuality {
  /** 비어있지 않은 스크립트가 있는 슬라이드 비율(0~1). */
  coverage: number;
  totalWords: number;
  /** 목표 시간 안에 다 말하려면 필요한 페이스(words / 목표분). */
  estimatedWpm: number;
  /** estimatedWpm의 기준선 대비 점수(0~100). */
  wpmScore: number;
  wpmBand: ScoreBand;
  /** 종합 점수(coverage × wpm 적합도). */
  overall: number;
}

/**
 * 생성 스크립트를 입력 슬라이드·목표 시간·기준선에 비춰 채점한다.
 * - coverage: 모든 슬라이드가 실제 내용을 담았는가(빈 스크립트 = 퇴보 신호).
 * - estimatedWpm: 목표 시간 대비 분량 → 기준선 WPM 구간 적합도(B-001). 너무 길거나 짧으면 감점.
 */
export function scoreScriptQuality(
  slides: SlideContent[],
  script: Script,
  targetDurationSec: number,
  baseline: Baseline,
  nonNative = false,
): ScriptQuality {
  const byIndex = new Map(script.content.map((c) => [c.slideIndex, c.text]));
  const covered = slides.filter((s) => (byIndex.get(s.index) ?? "").trim().length > 0).length;
  const coverage = slides.length > 0 ? covered / slides.length : 0;

  const totalWords = script.content.reduce((n, c) => n + countWords(c.text), 0);
  const minutes = targetDurationSec / 60;
  const estimatedWpm = minutes > 0 ? Math.round(totalWords / minutes) : 0;

  const wpmSpec = baseline.metrics.wpm;
  const wpm = wpmSpec
    ? scoreRange("estimatedWpm", estimatedWpm, wpmSpec, nonNative)
    : { score: 0, band: "low" as ScoreBand };

  const overall = Math.round(coverage * wpm.score);
  return {
    coverage: Math.round(coverage * 100) / 100,
    totalWords,
    estimatedWpm,
    wpmScore: wpm.score,
    wpmBand: wpm.band,
    overall,
  };
}
