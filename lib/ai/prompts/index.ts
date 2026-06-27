import { rhetoricGuidance } from "@/lib/ai/rhetoric/principles";
import type {
  AnalysisResult,
  Cue,
  GenOptions,
  L1Profile,
  QAItem,
  Script,
  SlideContent,
} from "@/lib/domain";

/** 처방적 cue → LLM이 겨냥할 영어 지시문(개선이 측정된 약점을 직접 고치게). */
function cueInstruction(c: Cue): string {
  const s = c.slideIndex;
  const v = c.value ?? 0;
  switch (c.kind) {
    case "pace_fast":
      return `Slide ${s} was spoken too fast (${v} WPM): split long sentences and add natural pause points so it's easier to pace.`;
    case "pace_slow":
      return `Slide ${s} was slow (${v} WPM): tighten the wording and remove padding.`;
    case "time_long":
      return `Slide ${s} ran long (${v}s): cut to the essentials and remove redundancy.`;
    case "time_short":
      return `Slide ${s} was rushed (${v}s): add a clearer transition or a bit more substance.`;
    case "filler":
      return `Slide ${s} had ${v} filler words clustered: simplify the phrasing so it's easier to say fluently.`;
  }
}

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
    prompt: `Slides:\n${slideList(slides)}\n\nWrite a spoken presentation script in language="${o.language}", tone="${o.tone}".\nThe talk must fill about ${o.targetDurationSec} seconds (~${minutes.toFixed(1)} min). At a natural ~150 words/min pace, write roughly ${targetWords} words TOTAL (about ${perSlide} words per slide) — enough spoken content to actually fill the time, not just bullet summaries.${biasNote}\n\nWrite like a great speaker — apply these expert public-speaking principles:\n${rhetoricGuidance()}\n\nReturn JSON: {"slides":[{"slideIndex":<number>,"text":"<spoken script>"}]}.\nIMPORTANT: produce EXACTLY ${slides.length} entries — one per input slide, reusing the same slideIndex values (${slides.map((s) => s.index).join(", ")}). Do NOT add extra intro or conclusion segments; fold any opening/closing remarks into the first/last slide.`,
  };
}

export function improveScriptPrompt(
  script: Script,
  analysis: AnalysisResult,
  l1?: L1Profile,
  cues: Cue[] = [],
): Prompt {
  const segs = script.content.map((c) => `#${c.slideIndex}: ${c.text}`).join("\n");
  const l1Note = l1
    ? `\nThe speaker's native language is "${l1.language}". Pay special attention to these common ${l1.language}-speaker mistakes and fix them where present:\n${l1.commonExpressionIssues.map((r) => `- ${r.issue} → ${r.suggestion}`).join("\n")}`
    : "";
  // 측정된 약점(처방 cue)을 슬라이드별 편집 지시로 — 개선이 데이터를 직접 겨냥.
  const cueNote =
    cues.length > 0
      ? `\nThis practice run had these measured issues — prioritize fixing the named slides:\n${cues.map((c) => `- ${cueInstruction(c)}`).join("\n")}`
      : "";
  return {
    system:
      "You are an expert English presentation editor. Improve clarity, naturalness, and pronounceability. Output STRICT JSON only.",
    prompt: `Current script:\n${segs}\n\nMeasured speaking pace: ${analysis.wpm} WPM.${cueNote}${l1Note}\n\nApply these expert public-speaking principles in your edits:\n${rhetoricGuidance()}\n\nFor each slide that needs improvement, return an entry.\nReturn JSON: {"entries":[{"slideIndex":<number>,"original":"<text>","improved":"<text>","reason":"<short reason>"}]}.`,
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

export function translatePrompt(texts: string[], targetLang: string, sourceLang: string): Prompt {
  const items = texts.map((t, i) => `#${i}: ${t}`).join("\n");
  return {
    system:
      "You are a professional subtitle translator. Translate faithfully and naturally, preserving meaning and tone. Output STRICT JSON only.",
    prompt: `Translate each item from "${sourceLang}" to "${targetLang}". Keep the same index for each.\nItems:\n${items}\n\nReturn JSON: {"items":[{"i":<number>,"text":"<translation>"}]} — exactly ${texts.length} entries, one per input index (${texts.map((_, i) => i).join(", ")}).`,
  };
}

export function evaluateAnswerPrompt(question: QAItem, answerText: string): Prompt {
  return {
    system:
      "You evaluate how well a spoken answer addresses an investor question, and suggest a better answer. Output STRICT JSON only.",
    prompt: `Question: ${question.question}\n\nSpeaker's answer (transcript): ${answerText}\n\nReturn JSON: {"relevanceScore":<0..1>,"improvedAnswer":"<a concise, stronger answer>"}.`,
  };
}
