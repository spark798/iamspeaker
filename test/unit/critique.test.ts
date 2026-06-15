import { ruleBasedCritique } from "@/lib/analysis/critique";
import type { SlideContent } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const slide = (index: number, text: string): SlideContent => ({
  index,
  textContent: text,
  notes: null,
});

describe("ruleBasedCritique", () => {
  it("정보 밀도를 글자수로 분류", () => {
    const out = ruleBasedCritique(
      [slide(0, "short"), slide(1, "a".repeat(150)), slide(2, "b".repeat(400))],
      300,
    );
    expect(out.map((c) => c.textDensity)).toEqual(["low", "medium", "high"]);
  });

  it("high 밀도 슬라이드에 이슈/제안 추가, 슬라이드 수만큼 반환", () => {
    const out = ruleBasedCritique([slide(0, "b".repeat(400))], 300);
    expect(out).toHaveLength(1);
    expect(out[0]?.issues.length).toBeGreaterThan(0);
    expect(out[0]?.suggestions.length).toBeGreaterThan(0);
  });

  it("빈 텍스트는 이슈로 표시", () => {
    const out = ruleBasedCritique([slide(0, "")], 60);
    expect(out[0]?.issues.some((i) => i.includes("텍스트가 없"))).toBe(true);
  });

  it("배정 시간 초과 분량을 지적", () => {
    const long = Array.from({ length: 300 }, () => "word").join(" ");
    const out = ruleBasedCritique([slide(0, long)], 10); // 10초 배정, ~138초 분량
    expect(out[0]?.issues.some((i) => i.includes("배정 시간"))).toBe(true);
  });
});
