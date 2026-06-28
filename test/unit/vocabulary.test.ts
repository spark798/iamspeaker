import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accessibleVocabGuidance, analyzeVocabulary } from "@/lib/analysis/vocabulary";
import { describe, expect, it } from "vitest";

describe("analyzeVocabulary", () => {
  it("고급(C1/C2) 단어를 짚고 대안·카운트 반환", () => {
    const r = analyzeVocabulary(["We", "utilize", "a", "myriad", "of", "tools"]);
    expect(r.advanced.map((a) => a.word).sort()).toEqual(["myriad", "utilize"]);
    expect(r.advanced.find((a) => a.word === "utilize")?.simpler).toBe("use");
    expect(r.advancedCount).toBe(2);
  });

  it("복수형(-s) 단순 폴백", () => {
    const r = analyzeVocabulary(["new", "paradigms", "here"]);
    expect(r.advanced.map((a) => a.word)).toEqual(["paradigms"]);
    expect(r.advanced[0]?.level).toBe("C2");
  });

  it("동일어 반복은 count 합산(빈도순)", () => {
    const r = analyzeVocabulary(["utilize", "leverage", "utilize"]);
    expect(r.advanced[0]).toMatchObject({ word: "utilize", count: 2 });
    expect(r.advancedCount).toBe(3);
  });

  it("B2는 목록엔 있으나 advancedCount(C1/C2)엔 제외", () => {
    const r = analyzeVocabulary(["this", "is", "robust"]);
    expect(r.advanced.map((a) => a.word)).toEqual(["robust"]);
    expect(r.advanced[0]?.level).toBe("B2");
    expect(r.advancedCount).toBe(0);
  });

  it("평이한 문장은 오검출 없음(precision)", () => {
    expect(analyzeVocabulary(["we", "help", "people", "use", "this", "tool"]).advanced).toEqual([]);
  });

  it("미지원 언어는 빈 결과", () => {
    expect(analyzeVocabulary(["음", "그", "약간"], "ko").advanced).toEqual([]);
  });
});

describe("accessibleVocabGuidance", () => {
  it("평이어 가이드 + 사전 예시 포함", () => {
    const g = accessibleVocabGuidance();
    expect(g).toMatch(/plain, everyday words/i);
    expect(g).toContain('"utilize"→"use"');
  });
});

interface VocabSample {
  id: string;
  language: string;
  words: string[];
  advancedWords: string[];
}

describe("vocabulary 정답셋 정밀도/재현율", () => {
  const file = join(process.cwd(), "eval/accuracy/vocabulary.json");
  const { samples } = JSON.parse(readFileSync(file, "utf8")) as { samples: VocabSample[] };

  it("정답셋 전 샘플에서 기대 고급어를 정확히 검출(누락·오검출 0)", () => {
    for (const s of samples) {
      const detected = analyzeVocabulary(s.words, s.language)
        .advanced.map((a) => a.word)
        .sort();
      expect(detected).toEqual([...s.advancedWords].sort());
    }
  });
});
