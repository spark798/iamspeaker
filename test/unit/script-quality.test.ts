import { loadBaseline } from "@/lib/analysis/baselines";
import type { Script, SlideContent } from "@/lib/domain";
import { scoreScriptQuality } from "@/lib/eval/script-quality";
import { describe, expect, it } from "vitest";

const slides: SlideContent[] = [
  { index: 0, textContent: "a", notes: null },
  { index: 1, textContent: "b", notes: null },
];
const baseline = loadBaseline("talk");

/** n단어짜리 텍스트. */
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const script = (texts: string[]): Script => ({
  version: 0,
  source: "ai_demo",
  content: texts.map((text, slideIndex) => ({ slideIndex, text })),
});

describe("scoreScriptQuality", () => {
  it("모든 슬라이드 커버 + 목표 페이스 적합 → 높은 overall", () => {
    // 목표 1분, 160단어 → 160wpm (talk ideal 150~170)
    const q = scoreScriptQuality(slides, script([words(80), words(80)]), 60, baseline);
    expect(q.coverage).toBe(1);
    expect(q.totalWords).toBe(160);
    expect(q.estimatedWpm).toBe(160);
    expect(q.wpmBand).toBe("ideal");
    expect(q.overall).toBe(100);
  });

  it("빈 스크립트 슬라이드 → coverage 하락이 overall을 끌어내림", () => {
    const q = scoreScriptQuality(slides, script([words(160), ""]), 60, baseline);
    expect(q.coverage).toBe(0.5);
    expect(q.overall).toBeLessThan(60); // coverage 0.5 × wpmScore
  });

  it("분량 과다 → 빠른 페이스 → wpm 점수 하락", () => {
    // 1분에 400단어 = 400wpm, talk idealMax 170, tolerance 30 → 한참 초과 = 0
    const q = scoreScriptQuality(slides, script([words(200), words(200)]), 60, baseline);
    expect(q.estimatedWpm).toBe(400);
    expect(q.wpmBand).toBe("high");
    expect(q.wpmScore).toBe(0);
    expect(q.overall).toBe(0);
  });

  it("비원어민 보정: 느린 페이스도 적정", () => {
    // 1분 140단어=140wpm. native talk(150~170)면 low지만, 비원어민(130~150)이면 ideal
    const native = scoreScriptQuality(slides, script([words(70), words(70)]), 60, baseline, false);
    const nonNative = scoreScriptQuality(
      slides,
      script([words(70), words(70)]),
      60,
      baseline,
      true,
    );
    expect(native.wpmBand).toBe("low");
    expect(nonNative.wpmBand).toBe("ideal");
  });

  it("목표 시간 0이면 estimatedWpm 0", () => {
    const q = scoreScriptQuality(slides, script([words(80), words(80)]), 0, baseline);
    expect(q.estimatedWpm).toBe(0);
  });
});
