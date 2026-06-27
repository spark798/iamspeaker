/**
 * 발표 원칙 지식베이스 — 명저들이 대중화한 **일반 발표 기법**을 자체 표현으로 요약하고
 * 출처를 귀속한다(self-improve modeling용). 데모 생성·개선 프롬프트가 이를 따르게 한다.
 *
 * ⚠️ 라이선스: 책 본문은 복제하지 않는다. "rule of three", "one idea per slide" 같은
 * 기법은 저작권 대상이 아닌 사실/방법론이며, 여기 문구는 모두 자체 작성이다(benchmark.md
 * 라이선스 결론과 동일 원칙). 출처는 그 기법을 대중화한 저작을 참고 표시한 것.
 *
 * 출처 약어: TEDGuide=Chris Anderson《The Official TED Guide to Public Speaking》,
 * TalkLikeTED=Carmine Gallo, Resonate=Nancy Duarte, PresZen=Garr Reynolds《Presentation Zen》,
 * Confessions=Scott Berkun《Confessions of a Public Speaker》, Toastmasters=Toastmasters Intl.
 */

export type PrincipleCategory =
  | "opening"
  | "structure"
  | "story"
  | "language"
  | "delivery"
  | "closing"
  | "slides";

export interface Principle {
  id: string;
  category: PrincipleCategory;
  /** 짧은 행동 지시(자체 작성). */
  text: string;
  /** 이 기법을 대중화한 참고 저작. */
  source: string;
}

export const PRINCIPLES: Principle[] = [
  // 오프닝
  {
    id: "hook-fast",
    category: "opening",
    text: "Open with a hook — a surprising fact, a sharp question, or a short concrete moment. Skip throat-clearing and agendas.",
    source: "TalkLikeTED, TEDGuide",
  },
  {
    id: "throughline-early",
    category: "opening",
    text: "State the single central idea (the throughline) early, so the audience knows what the talk is building toward.",
    source: "TEDGuide",
  },
  // 구조
  {
    id: "one-message",
    category: "structure",
    text: "Build everything toward one core message; cut points that don't serve it.",
    source: "Resonate, PresZen",
  },
  {
    id: "rule-of-three",
    category: "structure",
    text: "Group key points in threes — it is easier to follow and remember.",
    source: "TalkLikeTED",
  },
  {
    id: "contrast",
    category: "structure",
    text: "Create momentum by contrasting what is with what could be.",
    source: "Resonate",
  },
  {
    id: "signal-to-noise",
    category: "structure",
    text: "Maximize signal-to-noise: remove filler, qualifiers, and tangents.",
    source: "PresZen",
  },
  // 스토리
  {
    id: "concrete-story",
    category: "story",
    text: "Prefer a concrete story or specific example over abstract claims.",
    source: "TalkLikeTED, TEDGuide",
  },
  {
    id: "show-dont-tell",
    category: "story",
    text: "Show with vivid, specific detail instead of generic statements.",
    source: "PresZen",
  },
  // 언어(스크립트 문장)
  {
    id: "conversational",
    category: "language",
    text: "Write for the ear: short, spoken sentences, contractions, and 'you/we'.",
    source: "Confessions",
  },
  {
    id: "repeat-key-phrase",
    category: "language",
    text: "Repeat the one key phrase you want remembered.",
    source: "TalkLikeTED",
  },
  // 전달(페이싱)
  {
    id: "deliberate-pauses",
    category: "delivery",
    text: "Plant deliberate pauses before and after key lines; vary pace for emphasis.",
    source: "Toastmasters, TEDGuide",
  },
  // 클로징
  {
    id: "clear-takeaway",
    category: "closing",
    text: "End with one clear takeaway or call to action — not 'that's all, questions?'.",
    source: "Toastmasters, TEDGuide",
  },
  {
    id: "bookend",
    category: "closing",
    text: "Circle back to the opening hook to close the loop.",
    source: "Resonate",
  },
  // 슬라이드(스크립트 아님 — 슬라이드 비평/처방용)
  {
    id: "one-idea-per-slide",
    category: "slides",
    text: "One idea per slide; minimal text, large visuals (10-20-30 spirit).",
    source: "PresZen",
  },
  {
    id: "slides-support",
    category: "slides",
    text: "Slides support the speaker — they should not duplicate the spoken words.",
    source: "PresZen",
  },
  {
    id: "six-by-six",
    category: "slides",
    text: "Keep it to roughly six lines or fewer with a few words each — not paragraphs (6×6 guideline).",
    source: "PresZen",
  },
  {
    id: "visual-signal",
    category: "slides",
    text: "Use high-contrast, readable type and let visuals carry meaning; cut chartjunk and decoration.",
    source: "PresZen",
  },
  {
    id: "no-speaker-notes-slide",
    category: "slides",
    text: "If a slide is just your speaker notes, cut it or turn it into one image plus a headline.",
    source: "PresZen",
  },
];

/**
 * 처방 cue 종류 → 관련 원칙의 출처(표시용). 코칭 노트에 전문가 근거를 붙인다.
 * 연계 원칙: pace_*→deliberate-pauses/signal-to-noise, time_long·filler→signal-to-noise,
 * time_short→throughline-early.
 */
export function cuePrincipleSource(
  kind: "pace_fast" | "pace_slow" | "time_long" | "time_short" | "filler",
): string {
  switch (kind) {
    case "pace_fast":
      return "Toastmasters · TED Guide";
    case "pace_slow":
      return "Presentation Zen";
    case "time_long":
      return "Presentation Zen";
    case "time_short":
      return "TED Guide";
    case "filler":
      return "Presentation Zen";
  }
}

/** 스크립트(말하기) 생성·개선에 쓰는 카테고리(슬라이드 디자인 제외). */
export const SCRIPT_CATEGORIES: PrincipleCategory[] = [
  "opening",
  "structure",
  "story",
  "language",
  "delivery",
  "closing",
];

/**
 * 프롬프트에 끼울 원칙 블록(불릿). categories로 범위 제한, max로 개수 상한(프롬프트 비대 방지).
 * 출처는 모델이 따를 신뢰 신호로 함께 표기.
 */
export function rhetoricGuidance(
  categories: PrincipleCategory[] = SCRIPT_CATEGORIES,
  max = 10,
): string {
  const set = new Set(categories);
  return PRINCIPLES.filter((p) => set.has(p.category))
    .slice(0, max)
    .map((p) => `- ${p.text} (${p.source})`)
    .join("\n");
}
