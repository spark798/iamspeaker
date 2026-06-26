import type { MetricScore } from "@/lib/domain";

/**
 * 두 회차(테이크) 비교 수학(순수, 테스트 가능). 오케스트레이션은 compare-view.
 * 점수(0~100, 항상 높을수록 좋음)를 비교하면 WPM 같은 방향 모호성이 없다.
 */
export interface ScorePair {
  metric: string;
  /** 두 회차의 0~100 점수(해당 메트릭이 없으면 null). */
  a: number | null;
  b: number | null;
  /** b − a (양수 = B가 더 개선). 한쪽이라도 없으면 null. */
  delta: number | null;
}

/** 두 회차의 메트릭 점수를 메트릭 기준으로 정렬·합집합해 짝지운다. */
export function compareScores(a: MetricScore[], b: MetricScore[]): ScorePair[] {
  const byMetricA = new Map(a.map((s) => [s.metric, s.score]));
  const byMetricB = new Map(b.map((s) => [s.metric, s.score]));
  // a의 순서를 유지하고, b에만 있는 메트릭을 뒤에 추가.
  const order = [
    ...a.map((s) => s.metric),
    ...b.map((s) => s.metric).filter((m) => !byMetricA.has(m)),
  ];
  const seen = new Set<string>();
  const out: ScorePair[] = [];
  for (const metric of order) {
    if (seen.has(metric)) continue;
    seen.add(metric);
    const av = byMetricA.get(metric) ?? null;
    const bv = byMetricB.get(metric) ?? null;
    out.push({ metric, a: av, b: bv, delta: av !== null && bv !== null ? bv - av : null });
  }
  return out;
}

/** 단순 수치 델타(b − a). 한쪽이라도 null이면 null. */
export function valueDelta(a: number | null, b: number | null): number | null {
  return a !== null && b !== null ? Math.round((b - a) * 10) / 10 : null;
}
