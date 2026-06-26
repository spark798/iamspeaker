import { loadBaseline } from "@/lib/analysis/baselines";
import { resolveGoal } from "@/lib/analysis/goal";
import { describe, expect, it } from "vitest";

const talk = loadBaseline("talk");

describe("resolveGoal", () => {
  it("오버라이드 없으면 장르 기준선에서 도출", () => {
    const g = resolveGoal({}, talk, false);
    expect(g.wpmMin).toBe(talk.metrics.wpm?.idealMin);
    expect(g.wpmMax).toBe(talk.metrics.wpm?.idealMax);
    expect(g.fillerPerMinMax).toBeGreaterThan(0);
  });

  it("비원어민이면 WPM 보정 구간 사용", () => {
    const g = resolveGoal({}, talk, true);
    expect(g.wpmMin).toBe(talk.metrics.wpm?.nonNativeIdealMin);
    expect(g.wpmMax).toBe(talk.metrics.wpm?.nonNativeIdealMax);
  });

  it("사용자 지정값이 기준선을 덮어씀", () => {
    const g = resolveGoal({ goalWpmMin: 120, goalWpmMax: 140, goalFillerPerMin: 3 }, talk, false);
    expect(g).toEqual({ wpmMin: 120, wpmMax: 140, fillerPerMinMax: 3 });
  });

  it("일부만 지정하면 나머지는 기준선", () => {
    const g = resolveGoal({ goalFillerPerMin: 1 }, talk, false);
    expect(g.fillerPerMinMax).toBe(1);
    expect(g.wpmMin).toBe(talk.metrics.wpm?.idealMin);
  });

  it("null은 기준선으로(초기화)", () => {
    const g = resolveGoal({ goalWpmMin: null, goalFillerPerMin: null }, talk, false);
    expect(g.wpmMin).toBe(talk.metrics.wpm?.idealMin);
  });
});
