import { improveScriptPrompt } from "@/lib/ai/prompts";
import type { AnalysisResult, Cue, Script } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const script: Script = {
  version: 1,
  source: "user",
  content: [
    { slideIndex: 0, text: "Intro" },
    { slideIndex: 2, text: "Our solution scales" },
  ],
};
const analysis: AnalysisResult = {
  wpm: 160,
  fillerWords: [],
  slideTimeBreakdown: [],
  pronunciationIssues: [],
  pauseCount: 0,
  riskExpressions: [],
  prosody: null,
};

describe("improveScriptPrompt — cue 주입", () => {
  it("cue 없으면 측정 약점 섹션 없음", () => {
    const { prompt } = improveScriptPrompt(script, analysis);
    expect(prompt).not.toContain("measured issues");
  });

  it("cue를 슬라이드별 영어 편집 지시로 주입", () => {
    const cues: Cue[] = [
      { slideIndex: 2, kind: "pace_fast", value: 200 },
      { slideIndex: 0, kind: "filler", value: 4 },
    ];
    const { prompt } = improveScriptPrompt(script, analysis, undefined, cues);
    expect(prompt).toContain("measured issues");
    // 슬라이드 번호 + 값 + 행동 지시
    expect(prompt).toMatch(/Slide 2 was spoken too fast \(200 WPM\)/);
    expect(prompt).toMatch(/Slide 0 had 4 filler words/);
  });
});
