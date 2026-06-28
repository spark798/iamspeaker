/**
 * 어휘 수준 적합성 — 청중이 따라가기 어려운 고급(C1/C2) 단어를 짚고 쉬운 대안을 제시.
 *
 * 단어 사용 적합성 축의 두 번째(첫째=hedging/위험표현, lib/analysis/hedging.ts):
 *  - hedging은 신뢰도(레지스터) 문제.
 *  - 여기는 "청중이 이해할 수 있는가" — 발표는 글이 아니라 말이라 평이한 어휘가 유리(TED/PresZen 원칙).
 *
 * 사전은 연구 기반(research-informed: CEFR 레벨링·발표 가독성)으로 자체 작성한 starter —
 * 발표에서 흔히 과하게 쓰이는 C1/C2 단어 위주(정밀도 우선). 미수록 단어는 플래그하지 않는다(확장 가능).
 * 영어 발표 대상이므로 en만.
 */

export type CefrLevel = "B2" | "C1" | "C2";

interface CefrEntry {
  level: CefrLevel;
  /** 권장 평이어(plain English). */
  simpler: string;
}

/**
 * 발표에서 흔히 과하게 쓰이는 고급 어휘 → CEFR 레벨 + 평이한 대안.
 * 정밀도 우선 — 일상적이면서 "더 쉬운 말이 있는" 단어만. (자체 작성, 비저작권 사실)
 */
const CEFR_LEXICON: Record<string, CefrEntry> = {
  utilize: { level: "C1", simpler: "use" },
  leverage: { level: "C1", simpler: "use" },
  facilitate: { level: "C1", simpler: "help" },
  endeavor: { level: "C2", simpler: "try" },
  endeavour: { level: "C2", simpler: "try" },
  ascertain: { level: "C2", simpler: "find out" },
  commence: { level: "C1", simpler: "start" },
  terminate: { level: "C1", simpler: "end" },
  subsequently: { level: "C1", simpler: "later" },
  furthermore: { level: "B2", simpler: "also" },
  moreover: { level: "B2", simpler: "also" },
  nevertheless: { level: "B2", simpler: "still" },
  notwithstanding: { level: "C2", simpler: "despite" },
  paradigm: { level: "C2", simpler: "model" },
  synergy: { level: "C2", simpler: "teamwork" },
  ubiquitous: { level: "C2", simpler: "everywhere" },
  myriad: { level: "C2", simpler: "many" },
  plethora: { level: "C2", simpler: "plenty" },
  aforementioned: { level: "C2", simpler: "earlier" },
  aggregate: { level: "C1", simpler: "total" },
  methodology: { level: "C1", simpler: "method" },
  optimal: { level: "B2", simpler: "best" },
  prioritize: { level: "B2", simpler: "focus on" },
  robust: { level: "B2", simpler: "strong" },
  holistic: { level: "C1", simpler: "overall" },
  pertaining: { level: "C1", simpler: "about" },
  numerous: { level: "B2", simpler: "many" },
  approximately: { level: "B2", simpler: "about" },
  additional: { level: "B2", simpler: "more" },
  sufficient: { level: "B2", simpler: "enough" },
  consequently: { level: "B2", simpler: "so" },
  predominantly: { level: "C1", simpler: "mostly" },
  substantial: { level: "B2", simpler: "large" },
  comprehensive: { level: "B2", simpler: "complete" },
  innovative: { level: "B2", simpler: "new" },
  streamline: { level: "C1", simpler: "simplify" },
  endeavors: { level: "C2", simpler: "efforts" },
  utilization: { level: "C1", simpler: "use" },
  demonstrate: { level: "B2", simpler: "show" },
  implement: { level: "B2", simpler: "build" },
  initiate: { level: "C1", simpler: "start" },
  fundamental: { level: "B2", simpler: "basic" },
  significant: { level: "B2", simpler: "big" },
  obtain: { level: "B2", simpler: "get" },
  acquire: { level: "B2", simpler: "get" },
  expedite: { level: "C2", simpler: "speed up" },
  disseminate: { level: "C2", simpler: "share" },
  cognizant: { level: "C2", simpler: "aware" },
  juncture: { level: "C2", simpler: "point" },
  utilizes: { level: "C1", simpler: "uses" },
};

/** 단어 양끝 문장부호 제거 + 소문자. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

/** 사전 조회: 정확 일치 우선, 없으면 복수형(-s) 단순 폴백. */
function lookup(token: string): CefrEntry | undefined {
  const hit = CEFR_LEXICON[token];
  if (hit) return hit;
  if (token.endsWith("s")) return CEFR_LEXICON[token.slice(0, -1)];
  return undefined;
}

export interface AdvancedWord {
  word: string;
  level: CefrLevel;
  simpler: string;
  count: number;
}

export interface VocabularyResult {
  /** 고급(C1/C2)·중상급(B2) 단어 — 빈도순. */
  advanced: AdvancedWord[];
  /** 발견된 고급 단어 총 발생 수(C1/C2만 — 헤드라인 지표). */
  advancedCount: number;
}

/**
 * 스크립트 단어들에서 고급 어휘를 짚는다(순수 함수). 미지원 언어·미수록 단어는 무시.
 * advancedCount는 C1/C2만(가장 행동 가치 높은 신호); B2는 목록엔 포함하되 카운트 제외.
 */
export function analyzeVocabulary(words: string[], language = "en"): VocabularyResult {
  if (language !== "en") return { advanced: [], advancedCount: 0 };
  const acc = new Map<string, AdvancedWord>();
  for (const raw of words) {
    const w = normalize(raw);
    if (!w) continue;
    const entry = lookup(w);
    if (!entry) continue;
    const key = w;
    const existing = acc.get(key);
    if (existing) existing.count += 1;
    else acc.set(key, { word: w, level: entry.level, simpler: entry.simpler, count: 1 });
  }
  const advanced = [...acc.values()].sort((a, b) => b.count - a.count);
  const advancedCount = advanced
    .filter((a) => a.level === "C1" || a.level === "C2")
    .reduce((sum, a) => sum + a.count, 0);
  return { advanced, advancedCount };
}

/** 사전에서 평이어 대안 예시 추출(프롬프트 회피 가이드용). 사전과 자동 동기화. */
function vocabExamples(max = 4): string {
  return Object.entries(CEFR_LEXICON)
    .filter(([, e]) => e.level === "C1" || e.level === "C2")
    .slice(0, max)
    .map(([w, e]) => `"${w}"→"${e.simpler}"`)
    .join(", ");
}

/**
 * 데모/개선 프롬프트에 끼울 "평이한 어휘" 가이드(en). 사전 예시로 생성.
 * 발표는 귀로 듣는 것 — 청중이 따라갈 수 있게 일상어를 권한다.
 */
export function accessibleVocabGuidance(): string {
  return [
    "Use audience-friendly vocabulary — a talk is heard, not read, so prefer plain, everyday words over advanced ones:",
    `- Swap C1/C2 words for simpler equivalents (e.g. ${vocabExamples()}).`,
    "- Keep precise technical terms when needed, but don't use a big word where a small one works.",
  ].join("\n");
}
