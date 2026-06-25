import type { PhonemeRule } from "@/lib/domain";

/**
 * 전체 발음 점수(0~100) = 평균 단어 정확도(confidence 0~1) ×100. 단어가 없으면 null.
 * wav2vec2는 GOP 단어 confidence(정확 발음 음소 비율), 휴리스틱은 STT confidence(대용).
 */
export function pronunciationScore(confidences: number[]): number | null {
  if (confidences.length === 0) return null;
  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  return Math.round(Math.max(0, Math.min(1, mean)) * 100);
}

/**
 * IPA(espeak) 음소 → L1 규칙 targetPhoneme에서 찾을 키워드.
 * wav2vec2 GOP가 낸 실제 오발음 음소를 L1 PhonemeRule과 정밀 매칭하기 위함
 * (기존 "단어에 글자 포함" 휴리스틱보다 음소 근거가 정확함).
 */
const IPA_TO_KEYS: Record<string, string[]> = {
  θ: ["th", "θ"],
  ð: ["th", "ð"],
  f: ["f"],
  v: ["v"],
  z: ["z"],
  s: ["s"],
  r: ["r"],
  ɹ: ["r"],
  l: ["l"],
  ŋ: ["ŋ", "종성", "받침"],
  ɪ: ["ɪ", "/ɪ/"],
  iː: ["iː", "/iː/"],
  i: ["ɪ", "iː"],
  ə: ["schwa", "ə", "reduc", "축약"],
  w: ["w", "v"],
  b: ["b", "v"],
  p: ["p", "f"],
};

/** 음소에서 길이표시(ː)·강세(ˈˌ) 제거. */
export function normalizePhoneme(p: string): string {
  return p.replace(/[ˈˌ]/g, "").trim();
}

/**
 * 오발음 음소(IPA)를 L1 발음 규칙과 매칭. 음소→키워드 매핑 후, 규칙의 targetPhoneme(소문자)에
 * 키워드가 포함되면 해당 규칙 반환. 없으면 undefined.
 */
export function matchL1RuleByPhoneme(
  phoneme: string,
  rules: PhonemeRule[],
): PhonemeRule | undefined {
  const norm = normalizePhoneme(phoneme);
  const keys = IPA_TO_KEYS[norm] ?? IPA_TO_KEYS[norm.replace(/ː/g, "")] ?? [norm];
  for (const rule of rules) {
    const tp = rule.targetPhoneme.toLowerCase();
    for (const k of keys) {
      if (tp.includes(k.toLowerCase())) return rule;
    }
  }
  return undefined;
}
