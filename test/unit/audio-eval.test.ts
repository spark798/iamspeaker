import { wpmAccuracy } from "@/lib/eval/audio";
import { describe, expect, it } from "vitest";

describe("wpmAccuracy", () => {
  it("완벽 일치 → MAE 0, 100% 이내", () => {
    const r = wpmAccuracy([
      { id: "a", expected: 140, measured: 140 },
      { id: "b", expected: 120, measured: 120 },
    ]);
    expect(r).toMatchObject({ mae: 0, mape: 0, withinTolerance: 1 });
  });
  it("오차 계산 + tolerance 판정", () => {
    // 100 기대 vs 120 측정 = 20% 오차 → ±15% 밖
    const r = wpmAccuracy([{ id: "a", expected: 100, measured: 120 }], 0.15);
    expect(r.mae).toBe(20);
    expect(r.mape).toBe(0.2);
    expect(r.withinTolerance).toBe(0);
  });
  it("빈 입력은 통과", () => {
    expect(wpmAccuracy([])).toMatchObject({ withinTolerance: 1 });
  });
});
