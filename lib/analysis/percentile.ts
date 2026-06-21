import type {
  Baseline,
  LowerBetterSpec,
  MetricScore,
  RangeSpec,
  UpperLimitSpec,
} from "@/lib/domain";

const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** 적정 구간형: 구간 안=100, 밖은 tolerance 기준 선형 감점. 비원어민이면 보정 구간 사용. */
export function scoreRange(
  metric: string,
  value: number,
  spec: RangeSpec,
  nonNative = false,
): MetricScore {
  const min =
    nonNative && spec.nonNativeIdealMin !== undefined ? spec.nonNativeIdealMin : spec.idealMin;
  const max =
    nonNative && spec.nonNativeIdealMax !== undefined ? spec.nonNativeIdealMax : spec.idealMax;
  if (value < min) {
    return {
      metric,
      value,
      score: clampScore(100 * (1 - (min - value) / spec.tolerance)),
      band: "low",
    };
  }
  if (value > max) {
    return {
      metric,
      value,
      score: clampScore(100 * (1 - (value - max) / spec.tolerance)),
      band: "high",
    };
  }
  return { metric, value, score: 100, band: "ideal" };
}

/** 낮을수록 좋음형: ideal 이하=100, hard 이상=0, 사이 선형. */
export function scoreLowerBetter(
  metric: string,
  value: number,
  spec: LowerBetterSpec,
): MetricScore {
  if (value <= spec.ideal) return { metric, value, score: 100, band: "ideal" };
  const score = clampScore((100 * (spec.hard - value)) / (spec.hard - spec.ideal));
  return { metric, value, score, band: "high" };
}

/** 상한형: limit 이하=100, hard 이상=0, 사이 선형. */
export function scoreUpperLimit(metric: string, value: number, spec: UpperLimitSpec): MetricScore {
  if (value <= spec.limit) return { metric, value, score: 100, band: "ideal" };
  const score = clampScore((100 * (spec.hard - value)) / (spec.hard - spec.limit));
  return { metric, value, score, band: "high" };
}

export interface ScoreInput {
  wpm: number;
  totalFillers: number;
  pauseCount: number;
  durationSec: number;
  /** 슬라이드 평균 단어 수(덱 밀도). 없으면 밀도 점수 생략. */
  avgWordsPerSlide?: number;
  /** L1(모국어)이 발표 언어와 다르면 true → WPM 비원어민 보정 구간 적용. */
  nonNative: boolean;
}

const perMin = (count: number, durationSec: number): number =>
  Math.round((count / (durationSec / 60)) * 10) / 10;

/** 분석 결과를 기준선 대비 0~100 점수로 환산(측정 가능한 메트릭만). 분석 결과는 불변(표시 레이어). */
export function scoreAnalysis(input: ScoreInput, baseline: Baseline): MetricScore[] {
  const out: MetricScore[] = [];
  if (baseline.metrics.wpm) {
    out.push(scoreRange("wpm", input.wpm, baseline.metrics.wpm, input.nonNative));
  }
  if (baseline.metrics.fillerPerMin && input.durationSec > 0) {
    out.push(
      scoreLowerBetter(
        "fillerPerMin",
        perMin(input.totalFillers, input.durationSec),
        baseline.metrics.fillerPerMin,
      ),
    );
  }
  if (baseline.metrics.pausePerMin && input.durationSec > 0) {
    out.push(
      scoreRange(
        "pausePerMin",
        perMin(input.pauseCount, input.durationSec),
        baseline.metrics.pausePerMin,
      ),
    );
  }
  if (baseline.metrics.slideWordsPerSlide && input.avgWordsPerSlide !== undefined) {
    out.push(
      scoreUpperLimit(
        "slideWordsPerSlide",
        Math.round(input.avgWordsPerSlide),
        baseline.metrics.slideWordsPerSlide,
      ),
    );
  }
  return out;
}
