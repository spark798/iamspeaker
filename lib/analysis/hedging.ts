/**
 * 단어 사용 적합성 — 피치 신뢰도를 낮추는 "위험 표현"(hedging/모호어/자기비하) 검출.
 *
 * 필러(disfluency, lib/analysis/speech.ts)와는 다른 축이다:
 *  - 필러("um","you know")는 말더듬 → 빈도로 측정.
 *  - 위험 표현("I think","maybe","sort of","stuff")은 의미 있는 실제 단어인데
 *    투자자 앞 신뢰도를 떨어뜨리는 레지스터 문제 → "더 강한 대안"을 제시한다.
 *
 * 사전은 피치 코퍼스/언어학 연구 기반(research-informed: hedging·booster 문헌, 피치 분석).
 * 영어 발표 대상이므로 우선 en만. 다른 언어는 빈 결과(추후 확장).
 * 일부 표현은 FILLER_PHRASES와 겹치지만(sort of/kind of/i guess) 다른 렌즈로 의도된 중복 —
 * 이 모듈은 필러 카운트에 합산하지 않는다.
 */

import type { RiskCategory, RiskExpressionResult } from "@/lib/domain";

/** 한 위험 표현 사전 항목: 정규화 토큰 시퀀스 + 범주 + 코칭 힌트 키. */
interface RiskEntry {
  tokens: string[];
  category: RiskCategory;
  /** i18n 메시지 키 접미사(report에서 riskTip_<hint>로 사용 예정). */
  hint: string;
}

/**
 * en 위험 표현 사전. 정밀도 우선 — 다어절 패턴 중심으로 일상 동사("think","hope")의
 * 정당한 용법 오검출을 줄인다. 단일어는 그 자체로 추측·모호성이 강한 것만.
 */
const RISK_EN: RiskEntry[] = [
  // ── hedge: 주장을 약화시키는 추측/완곡 ──
  { tokens: ["i", "think"], category: "hedge", hint: "claim" },
  { tokens: ["i", "guess"], category: "hedge", hint: "claim" },
  { tokens: ["i", "believe"], category: "hedge", hint: "claim" },
  { tokens: ["i", "feel", "like"], category: "hedge", hint: "claim" },
  { tokens: ["i", "would", "say"], category: "hedge", hint: "claim" },
  { tokens: ["we", "hope"], category: "hedge", hint: "evidence" },
  { tokens: ["i", "hope"], category: "hedge", hint: "evidence" },
  { tokens: ["sort", "of"], category: "hedge", hint: "precise" },
  { tokens: ["kind", "of"], category: "hedge", hint: "precise" },
  { tokens: ["a", "little", "bit"], category: "hedge", hint: "precise" },
  { tokens: ["more", "or", "less"], category: "hedge", hint: "precise" },
  { tokens: ["maybe"], category: "hedge", hint: "claim" },
  { tokens: ["perhaps"], category: "hedge", hint: "claim" },
  { tokens: ["probably"], category: "hedge", hint: "evidence" },
  { tokens: ["possibly"], category: "hedge", hint: "evidence" },
  { tokens: ["hopefully"], category: "hedge", hint: "evidence" },
  { tokens: ["somewhat"], category: "hedge", hint: "precise" },
  // ── vague: 정밀도를 떨어뜨리는 모호어/막연한 수량 ──
  { tokens: ["stuff"], category: "vague", hint: "specific" },
  { tokens: ["things"], category: "vague", hint: "specific" },
  { tokens: ["a", "lot", "of"], category: "vague", hint: "quantify" },
  { tokens: ["a", "bunch", "of"], category: "vague", hint: "quantify" },
  { tokens: ["or", "something"], category: "vague", hint: "specific" },
  { tokens: ["and", "so", "on"], category: "vague", hint: "specific" },
  // ── apology: 자기 권위를 깎는 사과/유보 ──
  { tokens: ["sorry"], category: "apology", hint: "own" },
  { tokens: ["i'm", "not", "sure"], category: "apology", hint: "own" },
  { tokens: ["im", "not", "sure"], category: "apology", hint: "own" },
  { tokens: ["i'm", "no", "expert"], category: "apology", hint: "own" },
  { tokens: ["if", "that", "makes", "sense"], category: "apology", hint: "own" },
];

const RISK_LEXICON: Record<string, RiskEntry[]> = { en: RISK_EN };

/** 카테고리별 대표 예시(사전에서 추출) — 프롬프트 회피 가이드용. 사전과 자동 동기화. */
function riskExamples(category: RiskCategory, max = 3): string {
  return RISK_EN.filter((e) => e.category === category)
    .slice(0, max)
    .map((e) => `"${e.tokens.join(" ")}"`)
    .join(", ");
}

/**
 * 데모/개선 프롬프트에 끼울 "신뢰도 낮추는 표현 회피" 가이드(en).
 * 사전(RISK_EN)에서 예시를 뽑아 생성 — 사전이 바뀌면 가이드도 따라간다.
 * 피치 언어 코퍼스 연구 기반(hedging·신뢰도).
 */
export function riskAvoidanceGuidance(): string {
  return [
    "Speak with credibility — avoid expressions that weaken your authority in front of an audience:",
    `- Hedging / uncertainty (e.g. ${riskExamples("hedge")}) → state claims directly and confidently.`,
    `- Vague words (e.g. ${riskExamples("vague")}) → be specific and quantify.`,
    `- Apologies / self-deprecation (e.g. ${riskExamples("apology")}) → own your expertise.`,
  ].join("\n");
}

/** 단어 양끝 문장부호 제거 + 소문자(아포스트로피는 보존: i'm). */
function normalize(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
}

export interface RiskPosition {
  index: number;
  label: string;
  category: RiskCategory;
  hint: string;
}

/**
 * 위험 표현 위치 검출. 긴 패턴 우선(겹치면 먼저 매칭된 것 유지), 단일/다어절 모두.
 * 반환은 인덱스 오름차순. 필러와 독립 — 합산 금지.
 */
export function riskExpressionPositions(words: string[], language: string): RiskPosition[] {
  const lexicon = RISK_LEXICON[language] ?? [];
  if (lexicon.length === 0) return [];
  const norm = words.map(normalize);
  // 긴 패턴부터 시도해 "a little bit"가 "a"보다 우선되도록.
  const entries = [...lexicon].sort((a, b) => b.tokens.length - a.tokens.length);
  const flagged = new Map<number, Omit<RiskPosition, "index">>();

  for (const entry of entries) {
    const t = entry.tokens;
    for (let i = 0; i + t.length <= norm.length; i++) {
      // 이미 다른 패턴에 잡힌 토큰과 겹치면 건너뜀(중복 방지).
      let free = true;
      for (let k = 0; k < t.length; k++) {
        if (norm[i + k] !== t[k] || flagged.has(i + k)) {
          free = false;
          break;
        }
      }
      if (!free) continue;
      const label = t.join(" ");
      for (let k = 0; k < t.length; k++) {
        flagged.set(i + k, { label, category: entry.category, hint: entry.hint });
      }
    }
  }
  return [...flagged.entries()].sort((a, b) => a[0] - b[0]).map(([index, v]) => ({ index, ...v }));
}

/** 위험 표현을 라벨별로 집계(다어절은 1회 occurrence로 묶음). */
export function detectRiskExpressions(words: string[], language: string): RiskExpressionResult[] {
  const positions = riskExpressionPositions(words, language);
  const acc = new Map<string, RiskExpressionResult>();
  let prev: RiskPosition | null = null;
  for (const p of positions) {
    if (prev && prev.label === p.label && p.index === prev.index + 1) {
      prev = p;
      continue;
    }
    const entry = acc.get(p.label) ?? {
      label: p.label,
      category: p.category,
      hint: p.hint,
      count: 0,
    };
    entry.count += 1;
    acc.set(p.label, entry);
    prev = p;
  }
  return [...acc.values()];
}
