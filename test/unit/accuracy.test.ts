import { type FillerSample, evalFillers, prf } from "@/lib/eval/accuracy";
import { describe, expect, it } from "vitest";

describe("prf", () => {
  it("완벽 예측 → 1.0", () => {
    const r = prf([true, false, true], [true, false, true]);
    expect(r).toMatchObject({ precision: 1, recall: 1, f1: 1, tp: 2, fp: 0, fn: 0 });
  });
  it("재현율 갭(누락) 계산", () => {
    // gold 2개 필러 중 1개만 검출 → recall 0.5, precision 1
    const r = prf([true, false, false], [true, false, true]);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(0.5);
    expect(r.fn).toBe(1);
  });
  it("오검출(fp) → precision 하락", () => {
    const r = prf([true, true], [true, false]);
    expect(r.precision).toBe(0.5);
    expect(r.fp).toBe(1);
  });
});

describe("evalFillers", () => {
  const samples: FillerSample[] = [
    { id: "s1", language: "en", words: ["um", "I", "think"], fillerIndices: [0] },
    // 다어절 "you know" 검출 + 비필러 오검출 없음
    { id: "s2", language: "en", words: ["you", "know", "good"], fillerIndices: [0, 1] },
  ];
  it("단일어 + 다어절 모두 검출(누락 없음)", () => {
    const { overall, missed } = evalFillers(samples);
    expect(overall.tp).toBe(3); // um + you + know
    expect(missed).toEqual([]);
    expect(overall.recall).toBe(1);
    expect(overall.precision).toBe(1); // good 오검출 없음
  });
});
