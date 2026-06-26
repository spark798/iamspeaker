import type { Baseline } from "@/lib/domain";

/** 해석된 연습 목표 — WPM 적정 구간 + 필러/분 상한. */
export interface ResolvedGoal {
  wpmMin: number;
  wpmMax: number;
  fillerPerMinMax: number;
}

/** 세션의 사용자 지정 목표(없으면 null). */
export interface GoalOverrides {
  goalWpmMin?: number | null;
  goalWpmMax?: number | null;
  goalFillerPerMin?: number | null;
}

/**
 * 목표 해석(단일 진실원): 사용자 지정값 우선, 없으면 장르 기준선(+비원어민 보정)에서 도출.
 * progress·analysis(cues)·improve가 공유 — 중복 제거.
 */
export function resolveGoal(
  overrides: GoalOverrides,
  baseline: Baseline,
  nonNative: boolean,
): ResolvedGoal {
  const wpmSpec = baseline.metrics.wpm;
  const baseMin =
    nonNative && wpmSpec?.nonNativeIdealMin !== undefined
      ? wpmSpec.nonNativeIdealMin
      : (wpmSpec?.idealMin ?? 110);
  const baseMax =
    nonNative && wpmSpec?.nonNativeIdealMax !== undefined
      ? wpmSpec.nonNativeIdealMax
      : (wpmSpec?.idealMax ?? 150);
  const fillerSpec = baseline.metrics.fillerPerMin;
  // 기준선 필러 상한: ideal~hard 사이의 현실적 "양호" 지점.
  const baseFiller = fillerSpec
    ? Math.round(fillerSpec.ideal + (fillerSpec.hard - fillerSpec.ideal) * 0.4)
    : 5;
  return {
    wpmMin: overrides.goalWpmMin ?? baseMin,
    wpmMax: overrides.goalWpmMax ?? baseMax,
    fillerPerMinMax: overrides.goalFillerPerMin ?? baseFiller,
  };
}
