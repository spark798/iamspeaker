import type {
  AnalysisResult,
  GenOptions,
  L1Profile,
  QAItem,
  Script,
  SlideContent,
} from "@/lib/domain";

/** 프롬프트 템플릿(코드 인라인 금지 — 여기서 버전 관리). 각 빌더는 system+user를 반환. */
export interface Prompt {
  system: string;
  prompt: string;
}

function slideList(slides: SlideContent[]): string {
  return slides
    .map((s) => `#${s.index}: ${s.textContent}${s.notes ? ` (notes: ${s.notes})` : ""}`)
    .join("\n");
}

export function generateScriptPrompt(slides: SlideContent[], o: GenOptions): Prompt {
  const minutes = o.targetDurationSec / 60;
  // 분량 가이드: ~150 wpm 기준 목표 단어 수. 시간만 주면 모델이 과소 생성하므로 단어 수를 명시.
  const targetWords = Math.round(150 * minutes);
  const perSlide = Math.max(1, Math.round(targetWords / slides.length));
  const biasNote =
    o.lengthBias === "expand"
      ? `\nThe previous draft was TOO SHORT for the time budget. Expand substantially: add detail, concrete examples, and natural transitions so the total reaches about ${targetWords} words.`
      : o.lengthBias === "condense"
        ? `\nThe previous draft was TOO LONG. Tighten it to about ${targetWords} words while keeping key points.`
        : "";
  return {
    system:
      "You are an expert presentation coach for non-native English speakers. Write a natural spoken script, one segment per slide. Output STRICT JSON only, no prose.",
    prompt: `Slides:\n${slideList(slides)}\n\nWrite a spoken presentation script in language="${o.language}", tone="${o.tone}".\nThe talk must fill about ${o.targetDurationSec} seconds (~${minutes.toFixed(1)} min). At a natural ~150 words/min pace, write roughly ${targetWords} words TOTAL (about ${perSlide} words per slide) — enough spoken content to actually fill the time, not just bullet summaries.${biasNote}\nReturn JSON: {"slides":[{"slideIndex":<number>,"text":"<spoken script>"}]}.\nIMPORTANT: produce EXACTLY ${slides.length} entries — one per input slide, reusing the same slideIndex values (${slides.map((s) => s.index).join(", ")}). Do NOT add extra intro or conclusion segments; fold any opening/closing remarks into the first/last slide.`,
  };
}

export function improveScriptPrompt(
  script: Script,
  analysis: AnalysisResult,
  l1?: L1Profile,
): Prompt {
  const segs = script.content.map((c) => `#${c.slideIndex}: ${c.text}`).join("\n");
  const l1Note = l1
    ? `\nThe speaker's native language is "${l1.language}". Pay special attention to these common ${l1.language}-speaker mistakes and fix them where present:\n${l1.commonExpressionIssues.map((r) => `- ${r.issue} → ${r.suggestion}`).join("\n")}`
    : "";
  return {
    system:
      "You are an expert English presentation editor. Improve clarity, naturalness, and pronounceability. Output STRICT JSON only.",
    prompt: `Current script:\n${segs}\n\nMeasured speaking pace: ${analysis.wpm} WPM.${l1Note}\nFor each slide that needs improvement, return an entry.\nReturn JSON: {"entries":[{"slideIndex":<number>,"original":"<text>","improved":"<text>","reason":"<short reason>"}]}.`,
  };
}

export function critiqueSlidesPrompt(slides: SlideContent[], targetDurationSec: number): Prompt {
  return {
    system:
      "You are a presentation design critic. Assess each slide's information density and structure. Output STRICT JSON only.",
    prompt: `Slides:\n${slideList(slides)}\n\nTotal target time: ${targetDurationSec} seconds.\nReturn JSON: {"critiques":[{"slideIndex":<number>,"textDensity":"low|medium|high","estimatedReadTimeSec":<number>,"issues":["..."],"suggestions":["..."]}]}, exactly one per slide.`,
  };
}

export function generateQuestionsPrompt(
  slides: SlideContent[],
  script: Script,
  count: number,
): Prompt {
  const segs = script.content.map((c) => `#${c.slideIndex}: ${c.text}`).join("\n");
  return {
    system:
      "You are a sharp investor preparing pointed questions for a startup pitch. Mix easy clarifying questions with tough ones that probe weaknesses. Output STRICT JSON only.",
    prompt: `Slides:\n${slideList(slides)}\n\nScript:\n${segs}\n\nGenerate exactly ${count} questions.\nReturn JSON: {"questions":[{"question":"<text>","relatedSlideIndex":<number>,"difficulty":"easy|tough","category":"clarification|challenge|detail|numbers"}]}. Include at least one "tough" question that probes a weakness.`,
  };
}

export function evaluateAnswerPrompt(question: QAItem, answerText: string): Prompt {
  return {
    system:
      "You evaluate how well a spoken answer addresses an investor question, and suggest a better answer. Output STRICT JSON only.",
    prompt: `Question: ${question.question}\n\nSpeaker's answer (transcript): ${answerText}\n\nReturn JSON: {"relevanceScore":<0..1>,"improvedAnswer":"<a concise, stronger answer>"}.`,
  };
}
