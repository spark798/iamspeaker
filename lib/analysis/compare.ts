import type { Cue, MetricScore } from "@/lib/domain";

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

/** 처방 코칭 노트(cue)의 두 회차 간 변화. */
export interface CueChange {
  slideIndex: number;
  kind: Cue["kind"];
  /** resolved=A엔 있고 B엔 없음(개선), new=B에만(악화/신규), persisting=양쪽. */
  status: "resolved" | "persisting" | "new";
}

const STATUS_ORDER: Record<CueChange["status"], number> = {
  resolved: 0,
  persisting: 1,
  new: 2,
};

/**
 * 두 회차의 cue를 (슬라이드×종류) 키로 대조해 변화 분류.
 * 개선(resolved)→지속(persisting)→새 이슈(new) 순, 그 안에서 슬라이드 순.
 */
export function compareCues(a: Cue[], b: Cue[]): CueChange[] {
  const key = (c: Cue) => `${c.slideIndex}:${c.kind}`;
  const aKeys = new Set(a.map(key));
  const bKeys = new Set(b.map(key));
  const out: CueChange[] = [];
  for (const c of a) {
    if (!bKeys.has(key(c)))
      out.push({ slideIndex: c.slideIndex, kind: c.kind, status: "resolved" });
  }
  for (const c of b) {
    out.push({
      slideIndex: c.slideIndex,
      kind: c.kind,
      status: aKeys.has(key(c)) ? "persisting" : "new",
    });
  }
  return out.sort(
    (x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || x.slideIndex - y.slideIndex,
  );
}

/** cue 종류 → 카테고리(UI 라벨 그룹). */
export function cueCategory(kind: Cue["kind"]): "pace" | "time" | "filler" {
  if (kind === "pace_fast" || kind === "pace_slow") return "pace";
  if (kind === "time_long" || kind === "time_short") return "time";
  return "filler";
}
