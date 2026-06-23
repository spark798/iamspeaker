/** 오디오 eval 비교 수학(순수, 테스트 가능). 오케스트레이션은 scripts/eval-audio.ts. */

export interface WpmCase {
  id: string;
  /** 정답 WPM = 알려진 단어 수 / (실제 길이/60). */
  expected: number;
  /** 파이프라인 측정 WPM(STT 단어 수 기반). */
  measured: number;
}

export interface WpmAccuracy {
  mae: number; // 평균 절대 오차(WPM)
  mape: number; // 평균 절대 백분율 오차(0..1)
  withinTolerance: number; // tolerance 이내 비율(0..1)
}

/** WPM 정확도 — MAE·MAPE·허용오차 내 비율. tolerance는 상대(기본 0.15 = ±15%). */
export function wpmAccuracy(cases: WpmCase[], tolerance = 0.15): WpmAccuracy {
  if (cases.length === 0) return { mae: 0, mape: 0, withinTolerance: 1 };
  let absSum = 0;
  let pctSum = 0;
  let within = 0;
  for (const c of cases) {
    const abs = Math.abs(c.measured - c.expected);
    const pct = c.expected > 0 ? abs / c.expected : 0;
    absSum += abs;
    pctSum += pct;
    if (pct <= tolerance) within++;
  }
  return {
    mae: Math.round((absSum / cases.length) * 10) / 10,
    mape: Math.round((pctSum / cases.length) * 1000) / 1000,
    withinTolerance: Math.round((within / cases.length) * 100) / 100,
  };
}
