import {
  analyzeSpeech,
  computeSlideTimeBreakdown,
  computeWpm,
  detectFillerWords,
} from "@/lib/analysis/speech";
import type { TranscriptWord } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const w = (word: string, startSec: number): TranscriptWord => ({
  word,
  startSec,
  endSec: startSec + 0.3,
  confidence: 1,
});

describe("computeWpm", () => {
  it("단어수/분, 0 길이는 0", () => {
    expect(computeWpm(130, 60)).toBe(130);
    expect(computeWpm(100, 30)).toBe(200);
    expect(computeWpm(50, 0)).toBe(0);
  });
});

describe("detectFillerWords", () => {
  it("필러워드 빈도·타임스탬프(문장부호 무시)", () => {
    const words = [w("So", 0), w("um,", 1), w("I", 2), w("uh", 3), w("um", 5)];
    const out = detectFillerWords(words, "en");
    const um = out.find((f) => f.word === "um");
    expect(um?.count).toBe(2);
    expect(um?.timestamps).toEqual([1, 5]);
    expect(out.find((f) => f.word === "uh")?.count).toBe(1);
    expect(out.find((f) => f.word === "so")).toBeUndefined();
  });

  it("한국어 사전", () => {
    const out = detectFillerWords([w("음", 0), w("그", 1), w("발표", 2)], "ko");
    expect(out.map((f) => f.word).sort()).toEqual(["그", "음"]);
  });
});

describe("computeSlideTimeBreakdown", () => {
  it("전환 시점 → 슬라이드별 소요(마지막은 총 길이까지)", () => {
    const out = computeSlideTimeBreakdown(
      [
        { slideIndex: 0, atSec: 0 },
        { slideIndex: 1, atSec: 10 },
        { slideIndex: 2, atSec: 25 },
      ],
      40,
    );
    expect(out).toEqual([
      { slideIndex: 0, durationSec: 10 },
      { slideIndex: 1, durationSec: 15 },
      { slideIndex: 2, durationSec: 15 },
    ]);
  });

  it("전환 없으면 빈 배열", () => {
    expect(computeSlideTimeBreakdown([], 30)).toEqual([]);
  });
});

describe("analyzeSpeech", () => {
  it("전사+길이+전환을 분석 결과로 결합", () => {
    const r = analyzeSpeech({
      transcript: { text: "um hello", words: [w("um", 0), w("hello", 1)], durationSec: 2 },
      audioDurationSec: 60,
      transitions: [{ slideIndex: 0, atSec: 0 }],
      language: "en",
    });
    expect(r.wpm).toBe(2);
    expect(r.fillerWords[0]?.word).toBe("um");
    expect(r.slideTimeBreakdown).toHaveLength(1);
    expect(r.pronunciationIssues).toEqual([]);
  });
});
