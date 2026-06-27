import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectRiskExpressions, riskExpressionPositions } from "@/lib/analysis/hedging";
import { prf } from "@/lib/eval/accuracy";
import { describe, expect, it } from "vitest";

describe("riskExpressionPositions", () => {
  it("단일어 hedge 검출(maybe/probably)", () => {
    const p = riskExpressionPositions(["maybe", "this", "will", "probably", "work"], "en");
    expect(p.map((x) => x.index)).toEqual([0, 3]);
    expect(p.every((x) => x.category === "hedge")).toBe(true);
  });

  it("다어절 hedge 검출(sort of)", () => {
    const p = riskExpressionPositions(["it's", "sort", "of", "big"], "en");
    expect(p.map((x) => x.label)).toEqual(["sort of", "sort of"]);
  });

  it("긴 패턴 우선(a little bit이 a보다 우선)", () => {
    const p = riskExpressionPositions(["just", "a", "little", "bit", "slow"], "en");
    expect(p.map((x) => x.label)).toEqual(["a little bit", "a little bit", "a little bit"]);
  });

  it("강한 단정/근거 문장은 오검출 없음(precision)", () => {
    expect(
      riskExpressionPositions(["We", "reduce", "churn", "by", "thirty", "percent"], "en"),
    ).toEqual([]);
  });

  it("지원하지 않는 언어는 빈 결과", () => {
    expect(riskExpressionPositions(["음", "그", "약간"], "ko")).toEqual([]);
  });
});

describe("detectRiskExpressions 집계", () => {
  it("다어절은 1 occurrence, 범주 보존", () => {
    const r = detectRiskExpressions(["we", "hope", "for", "a", "lot", "of", "growth"], "en");
    const labels = r.map((x) => x.label).sort();
    expect(labels).toEqual(["a lot of", "we hope"]);
    expect(r.every((x) => x.count === 1)).toBe(true);
    expect(r.find((x) => x.label === "a lot of")?.category).toBe("vague");
  });
});

interface RiskSample {
  id: string;
  language: string;
  words: string[];
  riskIndices: number[];
}

describe("risk-expressions 정답셋 정밀도/재현율", () => {
  const file = join(process.cwd(), "eval/accuracy/risk-expressions.json");
  const { samples } = JSON.parse(readFileSync(file, "utf8")) as { samples: RiskSample[] };

  it("정답셋 전체에서 recall=1, precision=1", () => {
    const predicted: boolean[] = [];
    const gold: boolean[] = [];
    for (const s of samples) {
      const flagged = new Set(riskExpressionPositions(s.words, s.language).map((p) => p.index));
      const goldSet = new Set(s.riskIndices);
      for (let i = 0; i < s.words.length; i++) {
        predicted.push(flagged.has(i));
        gold.push(goldSet.has(i));
      }
    }
    const r = prf(predicted, gold);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(1);
  });
});
