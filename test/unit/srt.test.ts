import { buildSrt, formatTimestamp } from "@/lib/subtitle/srt";
import { describe, expect, it } from "vitest";

describe("formatTimestamp", () => {
  it("HH:MM:SS,mmm 포맷", () => {
    expect(formatTimestamp(0)).toBe("00:00:00,000");
    expect(formatTimestamp(3.5)).toBe("00:00:03,500");
    expect(formatTimestamp(3661.25)).toBe("01:01:01,250");
  });
  it("음수는 0으로", () => {
    expect(formatTimestamp(-5)).toBe("00:00:00,000");
  });
});

describe("buildSrt", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

  it("순차 큐 + 인덱스 1부터", () => {
    // 130wpm 기준 130단어=60초
    const srt = buildSrt([{ text: words(130) }, { text: words(65) }]);
    const blocks = srt.trim().split("\n\n");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.startsWith("1\n00:00:00,000 --> 00:01:00,000")).toBe(true);
    // 두 번째 큐는 첫 큐 끝(60s)에서 시작
    expect(blocks[1]?.startsWith("2\n00:01:00,000 -->")).toBe(true);
  });

  it("번역 병기 시 둘째 줄 추가", () => {
    const srt = buildSrt([{ text: "Hello", translation: "안녕하세요" }]);
    expect(srt).toContain("Hello\n안녕하세요");
  });

  it("최소 1초 보장(짧은 텍스트)", () => {
    const srt = buildSrt([{ text: "Hi" }]);
    expect(srt).toContain("00:00:00,000 --> 00:00:01,000");
  });

  it("빈 입력은 빈 문자열", () => {
    expect(buildSrt([])).toBe("");
  });
});
