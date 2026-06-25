/**
 * 반복 연습 루프 동기부여 요약(Pillar ① — "매일 함께 훈련하는 코치").
 * 회차별 측정 데이터(WPM·필러/분·날짜) 위에 개선도·베스트 테이크·목표 달성·스트릭을 산출.
 * 순수 함수(테스트 가능) — 오케스트레이션은 progress 라우트.
 */

export interface ProgressAttempt {
  recordingId: string;
  /** 녹음 시각(ms). 스트릭 계산용. */
  createdAt: number;
  /** 분석 완료 회차만 wpm/fillerPerMin이 채워짐(대기/실패는 null). */
  wpm: number | null;
  fillerPerMin: number | null;
}

/** 베스트 테이크 — 리포트로 링크하기 위해 recordingId 포함. */
export interface BestTake {
  recordingId: string;
  value: number;
}

export interface ProgressGoal {
  wpmMin: number;
  wpmMax: number;
  /** 필러/분 목표 상한(이하면 달성). */
  fillerPerMinMax: number;
}

/** 한 메트릭의 첫→최신 변화. */
export interface MetricDelta {
  first: number;
  latest: number;
  /** 개선 비율(0~1, 절대값). 방향은 improved로. */
  deltaPct: number;
  improved: boolean;
}

export interface ProgressSummary {
  analyzedCount: number;
  /** WPM 첫→최신(개선=목표구간에 더 가까워짐). 분석 2회+에서만. */
  wpm?: MetricDelta;
  /** 필러/분 첫→최신(개선=감소). */
  fillerPerMin?: MetricDelta;
  /** 베스트 테이크. 필러 최저 / WPM 목표구간에 가장 근접. */
  bestFiller?: BestTake;
  bestWpm?: BestTake;
  /** 목표(WPM 구간 + 필러 상한) 동시 달성 회차 수 / 최신 회차 달성 여부. */
  goalMetCount: number;
  latestMeetsGoal: boolean;
  /** 최신 연습일 기준 연속 연습 일수(달력일, UTC). */
  streakDays: number;
}

/** WPM이 목표 구간에서 벗어난 거리(구간 안=0). */
function wpmDistance(wpm: number, goal: ProgressGoal): number {
  if (wpm < goal.wpmMin) return goal.wpmMin - wpm;
  if (wpm > goal.wpmMax) return wpm - goal.wpmMax;
  return 0;
}

function pct(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : 1;
  return Math.round((Math.abs(to - from) / Math.abs(from)) * 100) / 100;
}

/** 최신 연습일에서 거꾸로 연속된 달력일(UTC) 수. */
function computeStreak(timestamps: number[]): number {
  if (timestamps.length === 0) return 0;
  const DAY = 86_400_000;
  const days = [...new Set(timestamps.map((t) => Math.floor(t / DAY)))].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if ((days[i - 1] as number) - (days[i] as number) === 1) streak++;
    else break;
  }
  return streak;
}

export function summarizeProgress(
  attempts: ProgressAttempt[],
  goal: ProgressGoal,
): ProgressSummary {
  type Analyzed = ProgressAttempt & { wpm: number; fillerPerMin: number };
  const analyzed = attempts.filter((a): a is Analyzed => a.wpm !== null && a.fillerPerMin !== null);
  const streakDays = computeStreak(attempts.map((a) => a.createdAt));

  if (analyzed.length === 0) {
    return { analyzedCount: 0, goalMetCount: 0, latestMeetsGoal: false, streakDays };
  }

  const first = analyzed[0] as Analyzed;
  const latest = analyzed[analyzed.length - 1] as Analyzed;

  // 목표 달성(WPM 구간 + 필러 상한 동시).
  const meetsGoal = (a: Analyzed) =>
    wpmDistance(a.wpm, goal) === 0 && a.fillerPerMin <= goal.fillerPerMinMax;
  const goalMetCount = analyzed.filter(meetsGoal).length;

  // 베스트: 필러 최저 / WPM 목표 근접(거리 최소, 동률이면 빠른 회차).
  let bestFiller = first;
  let bestWpm = first;
  for (const a of analyzed) {
    if (a.fillerPerMin < bestFiller.fillerPerMin) bestFiller = a;
    if (wpmDistance(a.wpm, goal) < wpmDistance(bestWpm.wpm, goal)) bestWpm = a;
  }

  const summary: ProgressSummary = {
    analyzedCount: analyzed.length,
    goalMetCount,
    latestMeetsGoal: meetsGoal(latest),
    streakDays,
    bestFiller: { recordingId: bestFiller.recordingId, value: bestFiller.fillerPerMin },
    bestWpm: { recordingId: bestWpm.recordingId, value: bestWpm.wpm },
  };

  // 첫→최신 변화는 분석 2회+에서만 의미.
  if (analyzed.length >= 2) {
    summary.wpm = {
      first: first.wpm,
      latest: latest.wpm,
      deltaPct: pct(first.wpm, latest.wpm),
      improved: wpmDistance(latest.wpm, goal) <= wpmDistance(first.wpm, goal),
    };
    summary.fillerPerMin = {
      first: first.fillerPerMin,
      latest: latest.fillerPerMin,
      deltaPct: pct(first.fillerPerMin, latest.fillerPerMin),
      improved: latest.fillerPerMin <= first.fillerPerMin,
    };
  }

  return summary;
}
