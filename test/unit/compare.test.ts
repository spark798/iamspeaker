import { compareCues, compareScores, cueCategory, valueDelta } from "@/lib/analysis/compare";
import type { Cue, MetricScore } from "@/lib/domain";
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

describe("cueCategory", () => {
  it("종류를 카테고리로 그룹", () => {
    expect(cueCategory("pace_fast")).toBe("pace");
    expect(cueCategory("pace_slow")).toBe("pace");
    expect(cueCategory("time_long")).toBe("time");
    expect(cueCategory("time_short")).toBe("time");
    expect(cueCategory("filler")).toBe("filler");
  });
});

describe("compareCues", () => {
  const c = (slideIndex: number, kind: Cue["kind"]): Cue => ({ slideIndex, kind });

  it("개선(resolved)·지속(persisting)·신규(new) 분류", () => {
    const a = [c(0, "pace_fast"), c(2, "filler")];
    const b = [c(2, "filler"), c(3, "time_long")];
    const out = compareCues(a, b);
    // slide0 pace_fast: A만 → resolved, slide2 filler: 양쪽 → persisting, slide3 time_long: B만 → new
    expect(out).toEqual([
      { slideIndex: 0, kind: "pace_fast", status: "resolved" },
      { slideIndex: 2, kind: "filler", status: "persisting" },
      { slideIndex: 3, kind: "time_long", status: "new" },
    ]);
  });

  it("정렬: resolved→persisting→new, 그 안 슬라이드 순", () => {
    const a = [c(5, "filler")];
    const b = [c(1, "pace_fast"), c(5, "filler")];
    const statuses = compareCues(a, b).map((x) => x.status);
    expect(statuses).toEqual(["persisting", "new"]); // filler 지속, slide1 신규
  });

  it("둘 다 비면 빈 배열", () => {
    expect(compareCues([], [])).toEqual([]);
  });
});
