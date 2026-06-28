import { isTranslatableLang } from "@/lib/translation";
import { describe, expect, it } from "vitest";

describe("isTranslatableLang", () => {
  it("지원 로케일(ko/en/ja/zh/es)은 true", () => {
    for (const l of ["ko", "en", "ja", "zh", "es"]) {
      expect(isTranslatableLang(l)).toBe(true);
    }
  });

  it("미지원/빈 값은 false (임의 문자열로 LLM 번역 방지)", () => {
    for (const l of ["fr", "xx", "", null, undefined, "EN"]) {
      expect(isTranslatableLang(l)).toBe(false);
    }
  });
});
