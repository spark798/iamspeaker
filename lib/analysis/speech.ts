import type {
  AnalysisResult,
  FillerWordResult,
  L1Profile,
  PronunciationIssue,
  SlideTimeBreakdown,
  SlideTransition,
  TranscriptResult,
  TranscriptWord,
} from "@/lib/domain";

/** 언어별 단일 토큰 필러워드 사전(소문자). */
const FILLER_WORDS: Record<string, ReadonlySet<string>> = {
  en: new Set([
    "um",
    "uhm",
    "uh",
    "uhh",
    "er",
    "erm",
    "ah",
    "hmm",
    "mhm",
    "like",
    "actually",
    "basically",
    "literally",
    "honestly",
    "anyway",
  ]),
  ko: new Set([
    "음",
    "어",
    "그",
    "그게",
    "그러니까",
    "뭐",
    "약간",
    "이제",
    "인제",
    "막",
    "뭐랄까",
    "아",
  ]),
};

/** 언어별 다어절 필러(담화표지). 정규화 토큰 시퀀스로 매칭. */
const FILLER_PHRASES: Record<string, string[][]> = {
  en: [
    ["you", "know"],
    ["i", "mean"],
    ["sort", "of"],
    ["kind", "of"],
    ["you", "see"],
    ["i", "guess"],
  ],
  ko: [["뭐", "랄까"]],
};

/** 즉시 반복(말더듬)에서 제외할 강조어(reduplication이 자연스러운 경우). */
const REPEAT_ALLOW = new Set(["very", "really", "so", "no", "yeah", "ha", "na", "bye"]);

/** "like"가 필러가 아닌 동사/구일 때의 앞 단어(정규화). 예: I/we/really/would like → 동사. */
const LIKE_VERB_PREV = new Set([
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "it",
  "really",
  "would",
  "to",
  "dont",
  "didnt",
]);

/** 단어 양끝의 문장부호 제거 + 소문자. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

/** WPM = 단어 수 / (실제 오디오 분). 분모는 readWavDurationSec 권장(transcript durationSec는 부정확할 수 있음). */
export function computeWpm(wordCount: number, audioDurationSec: number): number {
  if (audioDurationSec <= 0) return 0;
  return Math.round(wordCount / (audioDurationSec / 60));
}

/**
 * 필러 위치 검출 — 단일어 사전 + 다어절 구 + 즉시 반복(말더듬). 위치·라벨 반환.
 * 정밀도 유지를 위해 반복은 강조어(very 등)를 제외한 동일어 연속만 플래그.
 */
export function fillerPositions(
  words: string[],
  language: string,
): { index: number; label: string }[] {
  const dict = FILLER_WORDS[language] ?? FILLER_WORDS.en ?? new Set<string>();
  const phrases = FILLER_PHRASES[language] ?? [];
  const norm = words.map(normalize);
  const flagged = new Map<number, string>();

  // 다어절 구 우선(겹치면 구 라벨 유지)
  for (const phrase of phrases) {
    for (let i = 0; i + phrase.length <= norm.length; i++) {
      if (phrase.every((p, k) => norm[i + k] === p)) {
        const label = phrase.join(" ");
        for (let k = 0; k < phrase.length; k++) flagged.set(i + k, label);
      }
    }
  }
  // 단일어 + 즉시 반복
  for (let i = 0; i < norm.length; i++) {
    const w = norm[i];
    if (!w || flagged.has(i)) continue;
    // "like"는 앞 단어가 주어/동사 맥락이면 동사 → 필러 아님(precision).
    if (w === "like" && i > 0 && LIKE_VERB_PREV.has(norm[i - 1] ?? "")) continue;
    if (dict.has(w)) flagged.set(i, w);
    else if (i > 0 && w === norm[i - 1] && !REPEAT_ALLOW.has(w)) flagged.set(i, `${w} ${w}`);
  }
  return [...flagged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, label]) => ({ index, label }));
}

/** 필러(단일어·다어절·반복) 빈도·발생 위치(초) 집계. 다어절은 1회 occurrence로 합쳐 집계. */
export function detectFillerWords(words: TranscriptWord[], language: string): FillerWordResult[] {
  const positions = fillerPositions(
    words.map((w) => w.word),
    language,
  );
  const acc = new Map<string, FillerWordResult>();
  let prev: { index: number; label: string } | null = null;
  for (const p of positions) {
    // 같은 라벨의 연속 위치(다어절 구성 토큰)는 한 occurrence로 묶음.
    if (prev && prev.label === p.label && p.index === prev.index + 1) {
      prev = p;
      continue;
    }
    const ts = Math.round((words[p.index]?.startSec ?? 0) * 10) / 10;
    const entry = acc.get(p.label) ?? { word: p.label, count: 0, timestamps: [] };
    entry.count += 1;
    entry.timestamps.push(ts);
    acc.set(p.label, entry);
    prev = p;
  }
  return [...acc.values()];
}

/** 슬라이드 전환 타임스탬프 → 슬라이드별 소요 시간. */
export function computeSlideTimeBreakdown(
  transitions: SlideTransition[],
  totalDurationSec: number,
): SlideTimeBreakdown[] {
  const sorted = [...transitions].sort((a, b) => a.atSec - b.atSec);
  return sorted.map((t, i) => {
    const end =
      i + 1 < sorted.length ? (sorted[i + 1]?.atSec ?? totalDurationSec) : totalDurationSec;
    return {
      slideIndex: t.slideIndex,
      durationSec: Math.max(0, Math.round((end - t.atSec) * 10) / 10),
    };
  });
}

/** 영어 발음 난점 패턴(한국어 화자 빈출) → ko.json targetPhoneme와 매칭용. */
const PHONEME_PATTERNS: { key: string; test: RegExp }[] = [
  { key: "f", test: /f/ },
  { key: "v", test: /v/ },
  { key: "z", test: /z/ },
  { key: "th", test: /th/ },
  { key: "r", test: /r/ },
  { key: "l", test: /l/ },
];

/**
 * STT confidence가 낮은 단어를 발음 의심으로 추출하고, L1 발음 규칙과 교차한다(휴리스틱, DEVELOPMENT §7).
 * 단어에 L1 난점 음소 글자가 있으면 l1Related=true + 해당 교정 팁을 expectedSound로.
 */
export function detectPronunciationIssues(
  words: TranscriptWord[],
  l1Profile?: L1Profile,
  threshold = 0.6,
): PronunciationIssue[] {
  const rules = l1Profile?.commonPronunciationIssues ?? [];
  const matchRule = (w: string) => {
    for (const r of rules) {
      const tp = r.targetPhoneme.toLowerCase();
      for (const p of PHONEME_PATTERNS) {
        if (tp.includes(p.key) && p.test.test(w)) return r;
      }
    }
    return undefined;
  };

  const out: PronunciationIssue[] = [];
  for (const word of words) {
    if (word.confidence >= threshold) continue;
    const lw = word.word.toLowerCase().replace(/[^a-z]/g, "");
    if (!lw) continue;
    const rule = matchRule(lw);
    out.push({
      word: word.word,
      expectedSound: rule ? rule.description : "발음 정확도가 낮게 인식됨",
      confidence: word.confidence,
      timestamp: word.startSec,
      l1Related: rule !== undefined,
    });
  }
  return out;
}

export interface SpeechAnalysisInput {
  transcript: TranscriptResult;
  audioDurationSec: number;
  transitions: SlideTransition[];
  language: string;
  l1Profile?: L1Profile;
  /** 묵음 개수(오디오 silencedetect로 측정, lib/audio.countSilences). 없으면 0. */
  pauseCount?: number;
  /** 발음 이슈(발음 스코어러 어댑터 산출). 없으면 휴리스틱 폴백. */
  pronunciationIssues?: PronunciationIssue[];
}

/** 전사 + 오디오 길이 + 슬라이드 전환 + (선택) L1 프로필/묵음수/발음이슈 → 분석 결과. */
export function analyzeSpeech(input: SpeechAnalysisInput): AnalysisResult {
  return {
    wpm: computeWpm(input.transcript.words.length, input.audioDurationSec),
    fillerWords: detectFillerWords(input.transcript.words, input.language),
    slideTimeBreakdown: computeSlideTimeBreakdown(input.transitions, input.audioDurationSec),
    pronunciationIssues:
      input.pronunciationIssues ??
      detectPronunciationIssues(input.transcript.words, input.l1Profile),
    pauseCount: input.pauseCount ?? 0,
  };
}
