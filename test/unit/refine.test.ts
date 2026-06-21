import { generateWithRefinement } from "@/lib/ai/refine";
import type { ScriptGeneratorAdapter } from "@/lib/ai/types";
import { loadBaseline } from "@/lib/analysis/baselines";
import type { GenOptions, Script, ScriptDiff, SlideContent } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const slides: SlideContent[] = [
  { index: 0, textContent: "a", notes: null },
  { index: 1, textContent: "b", notes: null },
];
const baseline = loadBaseline("talk");
const opts: GenOptions = { targetDurationSec: 60, tone: "formal", language: "en" };

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const script = (total: number): Script => ({
  version: 0,
  source: "ai_demo",
  content: [
    { slideIndex: 0, text: words(Math.ceil(total / 2)) },
    { slideIndex: 1, text: words(Math.floor(total / 2)) },
  ],
});

/** lengthBias에 따라 단어 수를 바꾸는 mock 생성기. */
function mockGen(noBiasWords: number, expandWords: number): ScriptGeneratorAdapter {
  return {
    generate: async (_s, o: GenOptions) =>
      script(o.lengthBias === "expand" ? expandWords : noBiasWords),
    improve: async (): Promise<ScriptDiff> => ({ baseVersion: 0, entries: [] }),
  };
}

describe("generateWithRefinement", () => {
  it("분량 부족(low)이면 expand로 재생성해 더 나은 쪽 채택", async () => {
    // 60s 목표 → 1분. 80단어=80wpm(low) → expand 160단어=160wpm(ideal)
    const r = await generateWithRefinement(mockGen(80, 160), slides, opts, baseline);
    expect(r.attempts).toBe(2);
    expect(r.overall).toBe(100);
    const total = r.script.content.reduce((n, c) => n + c.text.split(" ").length, 0);
    expect(total).toBe(160);
  });

  it("이미 적정(ideal)이면 재시도 없음", async () => {
    const r = await generateWithRefinement(mockGen(160, 999), slides, opts, baseline);
    expect(r.attempts).toBe(1);
    expect(r.overall).toBe(100);
  });

  it("재생성이 더 나쁘면 원본 유지", async () => {
    // expand해도 여전히 짧음(100<원본보다 나음? 100wpm vs 80wpm → 둘 다 low지만 100이 더 높은 점수)
    // 원본 유지 검증: expand가 더 나쁘게(40단어) 나오는 경우
    const r = await generateWithRefinement(mockGen(80, 40), slides, opts, baseline);
    expect(r.attempts).toBe(2);
    const total = r.script.content.reduce((n, c) => n + c.text.split(" ").length, 0);
    expect(total).toBe(80); // 더 나쁜 retry를 버리고 원본 유지
  });

  it("둘 다 분량 미달(overall=0 동률)이어도 expand로 더 길어졌으면 채택", async () => {
    // 80wpm·120wpm 둘 다 low(<150)→overall 0 동률. expand가 더 길므로(120>80) 채택.
    const r = await generateWithRefinement(mockGen(80, 120), slides, opts, baseline);
    const total = r.script.content.reduce((n, c) => n + c.text.split(" ").length, 0);
    expect(total).toBe(120);
  });

  it("maxRetries=0이면 단일 생성", async () => {
    const r = await generateWithRefinement(mockGen(80, 160), slides, opts, baseline, 0);
    expect(r.attempts).toBe(1);
  });
});
