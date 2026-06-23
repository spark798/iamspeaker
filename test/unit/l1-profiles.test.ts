import { loadL1Profile } from "@/lib/ai/l1-profiles";
import { describe, expect, it } from "vitest";

describe("loadL1Profile", () => {
  it.each(["ko", "ja", "zh", "es", "vi"])("%s 프로필을 로드하고 형태를 검증", (lang) => {
    const p = loadL1Profile(lang);
    expect(p?.language).toBe(lang);
    expect(p?.commonPronunciationIssues.length).toBeGreaterThan(0);
    expect(p?.commonExpressionIssues.length).toBeGreaterThan(0);
    expect(p?.commonPronunciationIssues[0]).toHaveProperty("targetPhoneme");
    expect(p?.commonExpressionIssues[0]).toHaveProperty("suggestion");
  });

  it("미지원 언어(en/fr)/빈 값은 undefined", () => {
    expect(loadL1Profile("en")).toBeUndefined();
    expect(loadL1Profile("fr")).toBeUndefined();
    expect(loadL1Profile(null)).toBeUndefined();
    expect(loadL1Profile(undefined)).toBeUndefined();
    expect(loadL1Profile("")).toBeUndefined();
  });
});
