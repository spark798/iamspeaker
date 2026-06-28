import type { ProsodyResult } from "@/lib/domain";

/**
 * 억양·강세(프로소디) 분석 — 녹음 샘플에서 피치(F0)·에너지 다이내믹을 추정(순수 함수, 의존성 0).
 * 피치는 자기상관(autocorrelation, 옥타브 보정), 강세는 프레임 에너지 다이내믹 레인지.
 * 발표 코칭용 "거친" 신호 — 정밀 피치 추적이 아니라 "억양이 단조로운가/강세 변화가 있는가".
 */

const MIN_F0 = 75; // Hz (성인 저음 하한)
const MAX_F0 = 400; // Hz (상한)
const VOICED_AUTOCORR = 0.3; // 정규화 자기상관 임계(유성음 판정)
const MONOTONE_SEMITONES = 3; // 피치 변화 폭이 이 미만이면 단조
const MIN_VOICED_FRAMES = 20; // 신뢰성 있는 판정 최소 유성 프레임 수

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

function frameRms(s: Float32Array, start: number, len: number): number {
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const x = s[start + i] ?? 0;
    sum += x * x;
  }
  return Math.sqrt(sum / len);
}

/**
 * 한 프레임의 F0(Hz). 유성음 아니면 0. 옥타브 더블링 완화를 위해 전역 최대의 85% 이상인
 * 가장 작은 lag(=가장 높은 F0=기본주파수)를 택한다.
 */
function estimateF0(s: Float32Array, start: number, len: number, sr: number): number {
  const minLag = Math.floor(sr / MAX_F0);
  const maxLag = Math.ceil(sr / MIN_F0);
  let r0 = 0;
  for (let i = 0; i < len; i++) {
    const x = s[start + i] ?? 0;
    r0 += x * x;
  }
  if (r0 <= 1e-9) return 0;

  const corr: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < len - lag; i++) c += (s[start + i] ?? 0) * (s[start + i + lag] ?? 0);
    corr[lag - minLag] = c / r0;
  }
  // 지역 최대(peak)만 후보로 — 상승 엣지 오검출 방지. 옥타브 더블링 완화를 위해
  // 최대 피크의 85% 이상인 가장 작은 lag(=기본주파수=가장 높은 F0)를 택한다.
  let bestVal = 0;
  const peaks: number[] = []; // lag 값들
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const v = corr[lag - minLag] ?? 0;
    if (
      v >= VOICED_AUTOCORR &&
      v > (corr[lag - 1 - minLag] ?? 0) &&
      v >= (corr[lag + 1 - minLag] ?? 0)
    ) {
      peaks.push(lag);
      if (v > bestVal) bestVal = v;
    }
  }
  if (peaks.length === 0) return 0;
  const threshold = bestVal * 0.85;
  for (const lag of peaks) {
    if ((corr[lag - minLag] ?? 0) >= threshold) return sr / lag;
  }
  return 0;
}

/** 녹음 샘플 → 프로소디 결과. 프레임 40ms·hop 20ms. */
export function analyzeProsody(samples: Float32Array, sampleRate: number): ProsodyResult {
  const empty: ProsodyResult = {
    pitchMedianHz: 0,
    pitchRangeSemitones: 0,
    monotonePitch: false,
    dynamicsDb: 0,
    voicedRatio: 0,
  };
  if (sampleRate <= 0 || samples.length < sampleRate * 0.1) return empty;

  const frameSize = Math.round(0.04 * sampleRate);
  const hop = Math.round(0.02 * sampleRate);
  const f0s: number[] = [];
  const energies: number[] = [];
  let total = 0;
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    total++;
    energies.push(frameRms(samples, start, frameSize));
    const f0 = estimateF0(samples, start, frameSize, sampleRate);
    if (f0 > 0) f0s.push(f0);
  }
  if (total === 0) return empty;

  const voicedRatio = f0s.length / total;
  const sortedF0 = [...f0s].sort((a, b) => a - b);
  const p10 = percentile(sortedF0, 0.1);
  const p90 = percentile(sortedF0, 0.9);
  const median = percentile(sortedF0, 0.5);
  const rangeSemi = p10 > 0 && p90 > 0 ? 12 * Math.log2(p90 / p10) : 0;

  const sortedE = [...energies].sort((a, b) => a - b);
  const e25 = Math.max(percentile(sortedE, 0.25), 1e-6);
  const e90 = Math.max(percentile(sortedE, 0.9), 1e-6);
  const dynamicsDb = 20 * Math.log10(e90 / e25);

  const monotonePitch = f0s.length >= MIN_VOICED_FRAMES && rangeSemi < MONOTONE_SEMITONES;

  return {
    pitchMedianHz: Math.round(median),
    pitchRangeSemitones: Math.round(rangeSemi * 10) / 10,
    monotonePitch,
    dynamicsDb: Math.round(dynamicsDb * 10) / 10,
    voicedRatio: Math.round(voicedRatio * 100) / 100,
  };
}
