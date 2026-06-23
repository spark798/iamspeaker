import {
  analyzeSpeech,
  computeSlideTimeBreakdown,
  computeWpm,
  detectFillerWords,
  detectPronunciationIssues,
  fillerPositions,
} from "@/lib/analysis/speech";
import type { L1Profile, TranscriptWord } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const w = (word: string, startSec: number, confidence = 1): TranscriptWord => ({
  word,
  startSec,
  endSec: startSec + 0.3,
  confidence,
});

const koL1: L1Profile = {
  language: "ko",
  commonPronunciationIssues: [
    { targetPhoneme: "f", commonSubstitution: "p", description: "f→ㅍ 주의" },
    { targetPhoneme: "r / l", commonSubstitution: "혼동", description: "r/l 구분" },
  ],
  commonExpressionIssues: [],
};

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

describe("fillerPositions", () => {
  const idx = (words: string[], lang = "en") => fillerPositions(words, lang).map((p) => p.index);

  it("다어절 'you know' 양쪽 위치 검출", () => {
    expect(idx(["you", "know", "good"])).toEqual([0, 1]);
  });
  it("즉시 반복(the the) 검출, 강조어(very very)는 제외", () => {
    expect(idx(["the", "the", "thing"])).toEqual([1]);
    expect(idx(["very", "very", "good"])).toEqual([]);
  });
  it("'like'는 주어/동사 맥락이면 제외(I like / really like)", () => {
    expect(idx(["I", "like", "it"])).toEqual([]);
    expect(idx(["customers", "really", "like", "it"])).toEqual([]);
  });
  it("'like'가 담화표지면 검출(it's like good)", () => {
    expect(idx(["it's", "like", "good"])).toEqual([1]);
  });
  it("라벨: 다어절은 구 문자열", () => {
    expect(fillerPositions(["sort", "of", "stuff"], "en")[0]?.label).toBe("sort of");
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

describe("detectPronunciationIssues", () => {
  it("confidence가 높으면 이슈 없음", () => {
    expect(detectPronunciationIssues([w("coffee", 0, 0.95)], koL1)).toEqual([]);
  });

  it("낮은 confidence + L1 난점 음소(f) → l1Related + 교정 팁", () => {
    const out = detectPronunciationIssues([w("coffee", 1.5, 0.4)], koL1);
    expect(out).toHaveLength(1);
    expect(out[0]?.l1Related).toBe(true);
    expect(out[0]?.expectedSound).toBe("f→ㅍ 주의");
    expect(out[0]?.timestamp).toBe(1.5);
  });

  it("낮은 confidence지만 L1 난점 음소 없음 → l1Related=false", () => {
    const out = detectPronunciationIssues([w("data", 0, 0.3)], koL1);
    expect(out).toHaveLength(1);
    expect(out[0]?.l1Related).toBe(false);
  });

  it("L1 프로필 없어도 낮은 confidence는 잡되 l1Related=false", () => {
    const out = detectPronunciationIssues([w("coffee", 0, 0.3)]);
    expect(out).toHaveLength(1);
    expect(out[0]?.l1Related).toBe(false);
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
