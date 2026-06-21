import { loadL1Profile } from "@/lib/ai/l1-profiles";
import { describe, expect, it } from "vitest";

describe("loadL1Profile", () => {
  it("ko 프로필을 로드하고 형태를 검증", () => {
    const p = loadL1Profile("ko");
    expect(p?.language).toBe("ko");
    expect(p?.commonPronunciationIssues.length).toBeGreaterThan(0);
    expect(p?.commonExpressionIssues.length).toBeGreaterThan(0);
    expect(p?.commonPronunciationIssues[0]).toHaveProperty("targetPhoneme");
    expect(p?.commonExpressionIssues[0]).toHaveProperty("suggestion");
  });

  it("미지원 언어/빈 값은 undefined", () => {
    expect(loadL1Profile("ja")).toBeUndefined();
    expect(loadL1Profile(null)).toBeUndefined();
    expect(loadL1Profile(undefined)).toBeUndefined();
    expect(loadL1Profile("")).toBeUndefined();
  });
});
