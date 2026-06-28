import { critiqueSlidesPrompt, generateScriptPrompt, improveScriptPrompt } from "@/lib/ai/prompts";
import {
  PRINCIPLES,
  SCRIPT_CATEGORIES,
  cuePrincipleSource,
  rhetoricGuidance,
} from "@/lib/ai/rhetoric/principles";
import type { AnalysisResult, GenOptions, Script, SlideContent } from "@/lib/domain";
import { describe, expect, it } from "vitest";

describe("cuePrincipleSource", () => {
  it("cue 종류마다 출처를 귀속", () => {
    expect(cuePrincipleSource("pace_fast")).toMatch(/TED Guide/);
    expect(cuePrincipleSource("time_long")).toBe("Presentation Zen");
    expect(cuePrincipleSource("filler")).toBe("Presentation Zen");
    for (const k of ["pace_fast", "pace_slow", "time_long", "time_short", "filler"] as const) {
      expect(cuePrincipleSource(k).length).toBeGreaterThan(0);
    }
  });
});

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

  it("generateScriptPrompt에 위험 표현 회피 가이드 포함(데모가 hedging을 안 쓰게)", () => {
    const { prompt } = generateScriptPrompt(slides, opts);
    expect(prompt).toMatch(/weaken your authority/i);
    expect(prompt).toMatch(/Hedging/);
    expect(prompt).toContain('"i think"'); // 사전 예시 주입
  });

  it("generateScriptPrompt에 평이 어휘 가이드 포함(데모가 어려운 단어를 안 쓰게)", () => {
    const { prompt } = generateScriptPrompt(slides, opts);
    expect(prompt).toMatch(/plain, everyday words/i);
    expect(prompt).toContain('"utilize"→"use"'); // 사전 예시 주입
  });

  it("improveScriptPrompt에 원칙 가이드 포함", () => {
    const script: Script = { version: 1, source: "user", content: [{ slideIndex: 0, text: "x" }] };
    const analysis: AnalysisResult = {
      wpm: 150,
      fillerWords: [],
      slideTimeBreakdown: [],
      pronunciationIssues: [],
      pauseCount: 0,
      riskExpressions: [],
      prosody: null,
    };
    const { prompt } = improveScriptPrompt(script, analysis);
    expect(prompt).toContain("expert public-speaking principles");
  });

  it("critiqueSlidesPrompt에 슬라이드 디자인 원칙 포함(말하기 원칙 아님)", () => {
    const { prompt } = critiqueSlidesPrompt(slides, 300);
    expect(prompt).toContain("slide-design principles");
    expect(prompt).toMatch(/one idea per slide/i);
    expect(prompt).toMatch(/6×6|6x6/i);
    // 스크립트 전용 원칙(훅/threes)은 슬라이드 비평에 끼지 않음
    expect(prompt).not.toMatch(/threes/i);
  });
});
