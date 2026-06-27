import type {
  Cue,
  FillerWordResult,
  RiskExpressionResult,
  SlideTimeBreakdown,
  SlideTransition,
} from "@/lib/domain";

/**
 * 처방적 코칭 신호 생성(Pillar ② — 서술적 지표를 "어디서·무엇을"의 행동으로).
 * 슬라이드 구간별 페이스(WPM)·시간 예산·필러 밀집을 짚어 행동 가능한 cue를 만든다.
 * 순수 함수 — 오케스트레이션은 report 라우트. 데이터는 이미 저장된 것만 사용.
 */
export interface CueInput {
  breakdown: SlideTimeBreakdown[];
  transitions: SlideTransition[];
  totalDurationSec: number;
  fillerWords: FillerWordResult[];
  goalWpmMin: number;
  goalWpmMax: number;
  /** 발표 목표 시간(초)·덱 슬라이드 수 → 슬라이드당 시간 예산. */
  targetDurationSec: number;
  slideCount: number;
  /** 신뢰도를 낮추는 위험 표현(hedging/모호어/사과). 덱 단위 cue로 요약. */
  riskExpressions?: RiskExpressionResult[];
}

const MIN_WORDS_FOR_PACE = 10;
const PACE_FAST = 1.15;
const PACE_SLOW = 0.85;
const TIME_LONG = 1.6;
const TIME_SHORT = 0.4;
const FILLER_HOTSPOT = 3;
const MAX_CUES = 6;
// 위험 표현 덱 cue: 전체 발생 수가 이 값 이상이면 신뢰도 코칭 1건을 띄움.
const RISK_MIN = 2;
const RISK_EXAMPLES = 3;
// 페이스 변화도: 슬라이드 WPM 범위(max−min)가 평균의 이 비율 미만이면 단조(monotone).
const MONOTONE_REL_SPREAD = 0.12;
const MIN_SLIDES_FOR_VARIETY = 3;

export function generateCues(input: CueInput): Cue[] {
  const sorted = [...input.transitions].sort((a, b) => a.atSec - b.atSec);
  // breakdown은 동일 정렬에서 만들어졌으므로 인덱스로 정렬 transitions와 정합.
  const allFillerTs = input.fillerWords.flatMap((f) => f.timestamps);
  const budget =
    input.slideCount > 0 ? input.targetDurationSec / input.slideCount : Number.POSITIVE_INFINITY;

  const cues: Cue[] = [];
  const slideWpms: number[] = []; // 변화도(monotone) 판정용.
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (!t) continue;
    const endSec = i + 1 < sorted.length ? (sorted[i + 1]?.atSec ?? 0) : input.totalDurationSec;
    const bd = input.breakdown[i];
    const durationSec = bd?.durationSec ?? Math.max(0, endSec - t.atSec);
    const wordCount = bd?.wordCount;

    // 페이스(슬라이드별 WPM) — 단어가 충분할 때만.
    if (wordCount !== undefined && wordCount >= MIN_WORDS_FOR_PACE && durationSec > 0) {
      const slideWpm = Math.round(wordCount / (durationSec / 60));
      slideWpms.push(slideWpm);
      if (slideWpm > input.goalWpmMax * PACE_FAST) {
        cues.push({ slideIndex: t.slideIndex, kind: "pace_fast", value: slideWpm });
      } else if (slideWpm < input.goalWpmMin * PACE_SLOW) {
        cues.push({ slideIndex: t.slideIndex, kind: "pace_slow", value: slideWpm });
      }
    }

    // 시간 예산(슬라이드 체류 시간 vs 예산).
    if (Number.isFinite(budget) && durationSec > 0) {
      if (durationSec > budget * TIME_LONG) {
        cues.push({ slideIndex: t.slideIndex, kind: "time_long", value: Math.round(durationSec) });
      } else if (durationSec < budget * TIME_SHORT) {
        cues.push({ slideIndex: t.slideIndex, kind: "time_short", value: Math.round(durationSec) });
      }
    }

    // 필러 밀집(구간 [atSec, endSec)에 든 필러 타임스탬프 수).
    const fillerCount = allFillerTs.filter((ts) => ts >= t.atSec && ts < endSec).length;
    if (fillerCount >= FILLER_HOTSPOT) {
      cues.push({ slideIndex: t.slideIndex, kind: "filler", value: fillerCount });
    }
  }

  // 페이스 변화도(B): 슬라이드 간 WPM이 거의 일정하면 단조 — 강조 위해 변화를 권함.
  // 이미 빠름/느림 슬라이드(변화 있음)가 있으면 단조 아님 → 제외.
  const hasPaceOutlier = cues.some((c) => c.kind === "pace_fast" || c.kind === "pace_slow");
  if (slideWpms.length >= MIN_SLIDES_FOR_VARIETY && !hasPaceOutlier) {
    const mean = slideWpms.reduce((a, b) => a + b, 0) / slideWpms.length;
    const spread = Math.max(...slideWpms) - Math.min(...slideWpms);
    if (mean > 0 && spread / mean < MONOTONE_REL_SPREAD) {
      cues.push({ slideIndex: -1, kind: "monotone", value: Math.round(spread) });
    }
  }

  // 단어 사용 적합성(덱 단위): 신뢰도를 낮추는 위험 표현이 잦으면 1건 요약.
  const risks = input.riskExpressions ?? [];
  const riskTotal = risks.reduce((sum, r) => sum + r.count, 0);
  if (riskTotal >= RISK_MIN) {
    const examples = [...risks]
      .sort((a, b) => b.count - a.count)
      .slice(0, RISK_EXAMPLES)
      .map((r) => r.label)
      .join(", ");
    cues.push({ slideIndex: -1, kind: "risk", value: riskTotal, text: examples });
  }

  return cues.slice(0, MAX_CUES);
}
