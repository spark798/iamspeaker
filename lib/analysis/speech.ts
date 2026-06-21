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

/** 언어별 필러워드 사전(소문자, 단일 토큰). 다어절(you know 등)은 추후. */
const FILLER_WORDS: Record<string, ReadonlySet<string>> = {
  en: new Set([
    "um",
    "uhm",
    "uh",
    "er",
    "erm",
    "ah",
    "hmm",
    "mhm",
    "like",
    "actually",
    "basically",
    "literally",
  ]),
  ko: new Set(["음", "어", "그", "그게", "그러니까", "뭐", "약간", "이제", "인제", "막"]),
};

/** 단어 양끝의 문장부호 제거 + 소문자. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

/** WPM = 단어 수 / (실제 오디오 분). 분모는 readWavDurationSec 권장(transcript durationSec는 부정확할 수 있음). */
export function computeWpm(wordCount: number, audioDurationSec: number): number {
  if (audioDurationSec <= 0) return 0;
  return Math.round(wordCount / (audioDurationSec / 60));
}

/** 필러워드 빈도·발생 위치(초) 집계. */
export function detectFillerWords(words: TranscriptWord[], language: string): FillerWordResult[] {
  const dict = FILLER_WORDS[language] ?? FILLER_WORDS.en;
  const acc = new Map<string, FillerWordResult>();
  for (const w of words) {
    const n = normalize(w.word);
    if (!dict?.has(n)) continue;
    const entry = acc.get(n) ?? { word: n, count: 0, timestamps: [] };
    entry.count += 1;
    entry.timestamps.push(Math.round(w.startSec * 10) / 10);
    acc.set(n, entry);
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
}

/** 전사 + 오디오 길이 + 슬라이드 전환 + (선택) L1 프로필 → 분석 결과. */
export function analyzeSpeech(input: SpeechAnalysisInput): AnalysisResult {
  return {
    wpm: computeWpm(input.transcript.words.length, input.audioDurationSec),
    fillerWords: detectFillerWords(input.transcript.words, input.language),
    slideTimeBreakdown: computeSlideTimeBreakdown(input.transitions, input.audioDurationSec),
    pronunciationIssues: detectPronunciationIssues(input.transcript.words, input.l1Profile),
  };
}
