import { generateScriptPrompt, improveScriptPrompt } from "@/lib/ai/prompts";
import { PRINCIPLES, SCRIPT_CATEGORIES, rhetoricGuidance } from "@/lib/ai/rhetoric/principles";
import type { AnalysisResult, GenOptions, Script, SlideContent } from "@/lib/domain";
import { describe, expect, it } from "vitest";

describe("발표 원칙 KB", () => {
  it("모든 원칙이 id·카테고리·문구·출처를 가진다", () => {
    expect(PRINCIPLES.length).toBeGreaterThan(8);
    for (const p of PRINCIPLES) {
      expect(p.id).toBeTruthy();
      expect(p.text.length).toBeGreaterThan(10);
      expect(p.source).toBeTruthy();
    }
    // id 중복 없음
    expect(new Set(PRINCIPLES.map((p) => p.id)).size).toBe(PRINCIPLES.length);
  });

  it("rhetoricGuidance: 카테고리 필터 + 개수 상한 + 출처 표기", () => {
    const block = rhetoricGuidance(["opening"], 1);
    expect(block.split("\n")).toHaveLength(1);
    expect(block).toMatch(/\(.*\)$/); // 출처 괄호
    // 슬라이드 카테고리는 스크립트 가이드에 제외
    expect(SCRIPT_CATEGORIES).not.toContain("slides");
    const scriptBlock = rhetoricGuidance();
    expect(scriptBlock).not.toMatch(/one idea per slide/i);
  });
});

const slides: SlideContent[] = [{ index: 0, textContent: "Our product", notes: "" }];
const opts: GenOptions = {
  targetDurationSec: 120,
  tone: "formal",
  language: "en",
  nativeLanguage: "ko",
};

describe("프롬프트 원칙 주입", () => {
  it("generateScriptPrompt에 원칙 가이드 포함", () => {
    const { prompt } = generateScriptPrompt(slides, opts);
    expect(prompt).toContain("expert public-speaking principles");
    expect(prompt).toMatch(/threes/i); // rule-of-three 원칙
    expect(prompt).toMatch(/hook/i); // 오프닝 훅 원칙
  });

  it("improveScriptPrompt에 원칙 가이드 포함", () => {
    const script: Script = { version: 1, source: "user", content: [{ slideIndex: 0, text: "x" }] };
    const analysis: AnalysisResult = {
      wpm: 150,
      fillerWords: [],
      slideTimeBreakdown: [],
      pronunciationIssues: [],
      pauseCount: 0,
    };
    const { prompt } = improveScriptPrompt(script, analysis);
    expect(prompt).toContain("expert public-speaking principles");
  });
});
