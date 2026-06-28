import { resolvePronunciationScorer } from "@/lib/ai/pronunciation";
import { describe, expect, it } from "vitest";

describe("resolvePronunciationScorer", () => {
  it("wav2vec2 강제 → 가용 여부 무관 wav2vec2", () => {
    expect(resolvePronunciationScorer("wav2vec2", false)).toBe("wav2vec2");
    expect(resolvePronunciationScorer("wav2vec2", true)).toBe("wav2vec2");
  });

  it("heuristic 강제 → 항상 heuristic", () => {
    expect(resolvePronunciationScorer("heuristic", true)).toBe("heuristic");
  });

  it("auto → 가용하면 wav2vec2, 아니면 heuristic", () => {
    expect(resolvePronunciationScorer("auto", true)).toBe("wav2vec2");
    expect(resolvePronunciationScorer("auto", false)).toBe("heuristic");
  });
});
