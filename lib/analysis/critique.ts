import type { SlideContent, SlideCritique, TextDensity } from "@/lib/domain";
import { countWords } from "@/lib/script/estimate";

/**
 * 규칙 기반 슬라이드 비평(LLM 없이도 동작 — CLAUDE.md §2/§8 폴백 보장).
 * 글자수 기반 정보 밀도 + 시간 대비 분량을 1차 평가. LLM은 이 위에 자연어 피드백을 덧붙인다.
 */
export function ruleBasedCritique(
  slides: SlideContent[],
  targetDurationSec: number,
): SlideCritique[] {
  const perSlideBudget = slides.length > 0 ? targetDurationSec / slides.length : targetDurationSec;

  return slides.map((s) => {
    const len = s.textContent.length;
    const words = countWords(s.textContent);
    const textDensity: TextDensity = len > 300 ? "high" : len > 100 ? "medium" : "low";
    const estimatedReadTimeSec = Math.round((words / 130) * 60);
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (textDensity === "high") {
      issues.push("텍스트가 많아 읽기만 하게 될 수 있습니다");
      suggestions.push("핵심 3~5줄로 축약하고 세부 내용은 말로 전달하세요");
    }
    if (estimatedReadTimeSec > perSlideBudget * 1.5) {
      issues.push(`분량이 배정 시간(약 ${Math.round(perSlideBudget)}초)을 초과할 수 있습니다`);
      suggestions.push("내용을 줄이거나 슬라이드를 분할하세요");
    }
    if (words === 0) {
      issues.push("텍스트가 없습니다");
    }

    return { slideIndex: s.index, textDensity, estimatedReadTimeSec, issues, suggestions };
  });
}
