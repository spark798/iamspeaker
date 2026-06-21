import { loadBaseline } from "@/lib/analysis/baselines";
import {
  scoreAnalysis,
  scoreLowerBetter,
  scoreRange,
  scoreUpperLimit,
} from "@/lib/analysis/percentile";
import type { LowerBetterSpec, RangeSpec, UpperLimitSpec } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const wpmSpec: RangeSpec = {
  kind: "range",
  idealMin: 150,
  idealMax: 170,
  nonNativeIdealMin: 130,
  nonNativeIdealMax: 150,
  tolerance: 30,
};

describe("scoreRange", () => {
  it("구간 안이면 100·ideal", () => {
    expect(scoreRange("wpm", 160, wpmSpec)).toMatchObject({ score: 100, band: "ideal" });
  });
  it("구간보다 느리면 low + 선형 감점", () => {
    const r = scoreRange("wpm", 135, wpmSpec); // 150-135=15, 1-15/30=0.5
    expect(r.band).toBe("low");
    expect(r.score).toBe(50);
  });
  it("구간보다 빠르면 high + tolerance 밖은 0", () => {
    expect(scoreRange("wpm", 200, wpmSpec)).toMatchObject({ band: "high", score: 0 });
  });
  it("비원어민 보정 구간 적용(135는 비원어민 구간 안)", () => {
    expect(scoreRange("wpm", 135, wpmSpec, true)).toMatchObject({ score: 100, band: "ideal" });
  });
});

describe("scoreLowerBetter", () => {
  const spec: LowerBetterSpec = { kind: "lowerBetter", ideal: 2, hard: 10 };
  it("ideal 이하면 100", () => {
    expect(scoreLowerBetter("f", 1, spec)).toMatchObject({ score: 100, band: "ideal" });
  });
  it("중간값 선형", () => {
    // (10-6)/(10-2)=0.5
    expect(scoreLowerBetter("f", 6, spec).score).toBe(50);
  });
  it("hard 이상이면 0", () => {
    expect(scoreLowerBetter("f", 12, spec).score).toBe(0);
  });
});

describe("scoreUpperLimit", () => {
  const spec: UpperLimitSpec = { kind: "upperLimit", limit: 36, hard: 60 };
  it("limit 이하면 100", () => {
    expect(scoreUpperLimit("d", 30, spec)).toMatchObject({ score: 100, band: "ideal" });
  });
  it("초과 선형", () => {
    // (60-48)/(60-36)=0.5
    expect(scoreUpperLimit("d", 48, spec).score).toBe(50);
  });
});

describe("scoreAnalysis", () => {
  const baseline = loadBaseline("talk");
  it("wpm + filler/분 점수 산출", () => {
    const scores = scoreAnalysis(
      { wpm: 160, totalFillers: 2, durationSec: 60, nonNative: false },
      baseline,
    );
    const wpm = scores.find((s) => s.metric === "wpm");
    const filler = scores.find((s) => s.metric === "fillerPerMin");
    expect(wpm).toMatchObject({ score: 100, band: "ideal" });
    expect(filler).toMatchObject({ value: 2, score: 100, band: "ideal" });
  });
  it("durationSec=0이면 filler 점수 생략", () => {
    const scores = scoreAnalysis(
      { wpm: 160, totalFillers: 5, durationSec: 0, nonNative: false },
      baseline,
    );
    expect(scores.find((s) => s.metric === "fillerPerMin")).toBeUndefined();
  });
  it("비원어민이면 느린 WPM도 적정(보정 구간)", () => {
    const scores = scoreAnalysis(
      { wpm: 140, totalFillers: 0, durationSec: 60, nonNative: true },
      baseline,
    );
    expect(scores.find((s) => s.metric === "wpm")).toMatchObject({ band: "ideal" });
  });
});

describe("loadBaseline", () => {
  it("3장르 로드 + Zod 검증 통과", () => {
    for (const g of ["talk", "pitch", "lecture"] as const) {
      const b = loadBaseline(g);
      expect(b.genre).toBe(g);
      expect(b.metrics.wpm?.kind).toBe("range");
      expect(b.source.length).toBeGreaterThan(0);
    }
  });
});
