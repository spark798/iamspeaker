import { type CueInput, generateCues } from "@/lib/analysis/cues";
import { describe, expect, it } from "vitest";

const base: CueInput = {
  breakdown: [],
  transitions: [],
  totalDurationSec: 0,
  fillerWords: [],
  goalWpmMin: 130,
  goalWpmMax: 150,
  targetDurationSec: 120,
  slideCount: 2, // 예산 = 60초/슬라이드
};

describe("generateCues", () => {
  it("빠른 슬라이드 → pace_fast", () => {
    // 슬라이드 0: 40단어 / 10초 = 240 WPM (>150*1.15)
    const cues = generateCues({
      ...base,
      transitions: [{ slideIndex: 0, atSec: 0 }],
      totalDurationSec: 10,
      breakdown: [{ slideIndex: 0, durationSec: 10, wordCount: 40 }],
    });
    expect(cues).toContainEqual({ slideIndex: 0, kind: "pace_fast", value: 240 });
  });

  it("느린 슬라이드 → pace_slow", () => {
    // 12단어 / 20초 = 36 WPM (<130*0.85)
    const cues = generateCues({
      ...base,
      transitions: [{ slideIndex: 0, atSec: 0 }],
      totalDurationSec: 20,
      breakdown: [{ slideIndex: 0, durationSec: 20, wordCount: 12 }],
    });
    expect(cues.some((c) => c.kind === "pace_slow")).toBe(true);
  });

  it("단어 수가 적으면 페이스 cue 없음(노이즈 회피)", () => {
    const cues = generateCues({
      ...base,
      transitions: [{ slideIndex: 0, atSec: 0 }],
      totalDurationSec: 2,
      breakdown: [{ slideIndex: 0, durationSec: 2, wordCount: 5 }],
    });
    expect(cues.some((c) => c.kind.startsWith("pace"))).toBe(false);
  });

  it("예산 초과 → time_long", () => {
    // 예산 60초, 슬라이드 110초 (>60*1.6=96)
    const cues = generateCues({
      ...base,
      transitions: [{ slideIndex: 0, atSec: 0 }],
      totalDurationSec: 110,
      breakdown: [{ slideIndex: 0, durationSec: 110, wordCount: 200 }],
    });
    expect(cues.some((c) => c.kind === "time_long" && c.value === 110)).toBe(true);
  });

  it("필러 밀집 → filler(구간 버킷)", () => {
    const cues = generateCues({
      ...base,
      transitions: [
        { slideIndex: 0, atSec: 0 },
        { slideIndex: 1, atSec: 30 },
      ],
      totalDurationSec: 60,
      breakdown: [
        { slideIndex: 0, durationSec: 30, wordCount: 60 },
        { slideIndex: 1, durationSec: 30, wordCount: 60 },
      ],
      // 슬라이드 0 구간[0,30)에 3개, 슬라이드 1엔 1개
      fillerWords: [{ word: "um", count: 4, timestamps: [5, 10, 20, 45] }],
    });
    expect(cues).toContainEqual({ slideIndex: 0, kind: "filler", value: 3 });
    expect(cues.some((c) => c.slideIndex === 1 && c.kind === "filler")).toBe(false);
  });

  it("최대 cue 수를 6으로 제한", () => {
    const transitions = Array.from({ length: 10 }, (_, i) => ({ slideIndex: i, atSec: i * 100 }));
    const breakdown = transitions.map((t) => ({
      slideIndex: t.slideIndex,
      durationSec: 100, // 모두 예산 초과
      wordCount: 300, // 모두 빠름
    }));
    const cues = generateCues({
      ...base,
      transitions,
      totalDurationSec: 1000,
      breakdown,
    });
    expect(cues.length).toBeLessThanOrEqual(6);
  });
});
