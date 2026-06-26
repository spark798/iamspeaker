import { compareScores, valueDelta } from "@/lib/analysis/compare";
import type { MetricScore } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const s = (metric: string, score: number): MetricScore => ({
  metric,
  value: 0,
  score,
  band: "ideal",
});

describe("compareScores", () => {
  it("같은 메트릭을 짝지어 델타(b−a) 산출", () => {
    const a = [s("wpm", 60), s("fillerPerMin", 80)];
    const b = [s("wpm", 90), s("fillerPerMin", 50)];
    const out = compareScores(a, b);
    expect(out).toEqual([
      { metric: "wpm", a: 60, b: 90, delta: 30 },
      { metric: "fillerPerMin", a: 80, b: 50, delta: -30 },
    ]);
  });

  it("한쪽에만 있는 메트릭은 null·delta null, a 순서 유지 후 b 추가", () => {
    const a = [s("wpm", 70)];
    const b = [s("wpm", 70), s("pausePerMin", 40)];
    const out = compareScores(a, b);
    expect(out).toEqual([
      { metric: "wpm", a: 70, b: 70, delta: 0 },
      { metric: "pausePerMin", a: null, b: 40, delta: null },
    ]);
  });

  it("빈 입력은 빈 결과", () => {
    expect(compareScores([], [])).toEqual([]);
  });
});

describe("valueDelta", () => {
  it("b−a, 한쪽 null이면 null", () => {
    expect(valueDelta(10, 14)).toBe(4);
    expect(valueDelta(null, 5)).toBeNull();
    expect(valueDelta(5, null)).toBeNull();
  });
});
