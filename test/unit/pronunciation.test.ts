import { loadL1Profile } from "@/lib/ai/l1-profiles";
import { gopWordsToIssues } from "@/lib/ai/pronunciation/wav2vec2";
import {
  matchL1RuleByPhoneme,
  normalizePhoneme,
  pronunciationScore,
} from "@/lib/analysis/pronunciation";
import { describe, expect, it } from "vitest";

const ko = loadL1Profile("ko");
const rules = ko?.commonPronunciationIssues ?? [];

describe("pronunciationScore", () => {
  it("평균 confidence ×100, 반올림", () => {
    expect(pronunciationScore([1, 1, 1])).toBe(100);
    expect(pronunciationScore([0.5, 1])).toBe(75);
    expect(pronunciationScore([0.8, 0.6, 0.7])).toBe(70);
  });

  it("단어 없으면 null", () => {
    expect(pronunciationScore([])).toBeNull();
  });

  it("0~100으로 클램프", () => {
    expect(pronunciationScore([1.5])).toBe(100);
    expect(pronunciationScore([-0.2])).toBe(0);
  });
});

describe("normalizePhoneme", () => {
  it("길이·강세 표시 제거", () => {
    expect(normalizePhoneme("ˈθ")).toBe("θ");
    expect(normalizePhoneme("iː")).toBe("iː");
  });
});

describe("matchL1RuleByPhoneme", () => {
  it("θ → ko th 규칙", () => {
    expect(matchL1RuleByPhoneme("θ", rules)?.targetPhoneme).toContain("th");
  });
  it("f → ko f 규칙", () => {
    expect(matchL1RuleByPhoneme("f", rules)?.targetPhoneme).toBe("f");
  });
  it("r → ko r/l 규칙", () => {
    expect(matchL1RuleByPhoneme("r", rules)?.targetPhoneme).toContain("r");
  });
  it("ŋ → 종성 규칙(키워드 매핑)", () => {
    expect(matchL1RuleByPhoneme("ŋ", rules)?.targetPhoneme).toMatch(/종성|받침/);
  });
  it("매칭 없는 음소는 undefined", () => {
    expect(matchL1RuleByPhoneme("k", rules)).toBeUndefined();
  });
});

describe("gopWordsToIssues", () => {
  it("threshold 이상 confidence는 통과(이슈 없음)", () => {
    const out = gopWordsToIssues(
      [{ word: "good", startSec: 0, confidence: 0.9, worstPhoneme: "g" }],
      rules,
    );
    expect(out).toEqual([]);
  });
  it("낮은 confidence + L1 음소 → l1Related + 규칙 설명", () => {
    const out = gopWordsToIssues(
      [{ word: "think", startSec: 1.2, confidence: 0.3, worstPhoneme: "θ" }],
      rules,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ word: "think", l1Related: true, timestamp: 1.2 });
    expect(out[0]?.expectedSound).toContain("th");
  });
  it("낮은 confidence + 비-L1 음소 → l1Related=false + 음소 안내", () => {
    const out = gopWordsToIssues(
      [{ word: "back", startSec: 0, confidence: 0.2, worstPhoneme: "k" }],
      rules,
    );
    expect(out[0]?.l1Related).toBe(false);
    expect(out[0]?.expectedSound).toContain("/k/");
  });
});
