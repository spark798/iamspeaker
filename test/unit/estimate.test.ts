import { countWords, estimateSpeakingSec } from "@/lib/script/estimate";
import { describe, expect, it } from "vitest";

describe("countWords", () => {
  it("공백 기준 단어 수, 빈 문자열은 0", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  a  b   c ")).toBe(3);
  });
});

describe("estimateSpeakingSec", () => {
  it("130 WPM 기준 총 시간(초)", () => {
    // 130 단어 = 60초
    const words130 = Array.from({ length: 130 }, () => "w").join(" ");
    expect(estimateSpeakingSec([words130])).toBe(60);
    expect(estimateSpeakingSec(["", ""])).toBe(0);
  });

  it("여러 세그먼트 합산", () => {
    expect(estimateSpeakingSec(["one two three", "four five"], 60)).toBe(5); // 5단어/60wpm=5초
  });
});
