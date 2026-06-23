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
    // "you know" 다어절은 현재 사전이 못 잡음 → 누락
    { id: "s2", language: "en", words: ["you", "know", "good"], fillerIndices: [0, 1] },
  ];
  it("검출 가능한 필러는 잡고, 미지원은 missed로 보고", () => {
    const { overall, missed } = evalFillers(samples);
    expect(overall.tp).toBe(1); // "um"
    expect(missed).toContain("you");
    expect(missed).toContain("know");
    expect(overall.recall).toBeLessThan(1); // 다어절 미지원 → 재현율 갭
  });
});
