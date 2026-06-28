import { analyzeProsody } from "@/lib/analysis/prosody";
import { describe, expect, it } from "vitest";

const SR = 16000;

/** 일정 피치 사인파. */
function sine(hz: number, sec: number, amp = 0.5): Float32Array {
  const n = Math.round(SR * sec);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = amp * Math.sin((2 * Math.PI * hz * i) / SR);
  return s;
}

/** 피치가 from→to로 선형 변하는 스윕. */
function sweep(from: number, to: number, sec: number): Float32Array {
  const n = Math.round(SR * sec);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const hz = from + ((to - from) * i) / n;
    phase += (2 * Math.PI * hz) / SR;
    s[i] = 0.5 * Math.sin(phase);
  }
  return s;
}

describe("analyzeProsody", () => {
  it("일정 피치(200Hz 사인) → 단조 억양 + 정확한 중앙 피치", () => {
    const r = analyzeProsody(sine(200, 2), SR);
    expect(r.pitchMedianHz).toBeGreaterThan(190);
    expect(r.pitchMedianHz).toBeLessThan(210);
    expect(r.pitchRangeSemitones).toBeLessThan(3);
    expect(r.monotonePitch).toBe(true);
    expect(r.voicedRatio).toBeGreaterThan(0.8);
  });

  it("피치 스윕(150→300Hz) → 단조 아님(넓은 피치 범위)", () => {
    const r = analyzeProsody(sweep(150, 300, 2), SR);
    expect(r.pitchRangeSemitones).toBeGreaterThan(6);
    expect(r.monotonePitch).toBe(false);
  });

  it("화이트 노이즈 → 유성음 거의 없음, 단조 아님", () => {
    const n = SR * 1;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = (Math.random() * 2 - 1) * 0.5;
    const r = analyzeProsody(s, SR);
    expect(r.monotonePitch).toBe(false);
  });

  it("너무 짧으면 빈 결과", () => {
    const r = analyzeProsody(new Float32Array(100), SR);
    expect(r).toMatchObject({ voicedRatio: 0, monotonePitch: false });
  });
});
