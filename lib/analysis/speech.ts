import type {
  AnalysisResult,
  FillerWordResult,
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

export interface SpeechAnalysisInput {
  transcript: TranscriptResult;
  audioDurationSec: number;
  transitions: SlideTransition[];
  language: string;
}

/** 전사 + 오디오 길이 + 슬라이드 전환 → 분석 결과. (발음 분석은 추후 -ojf 토큰 확률) */
export function analyzeSpeech(input: SpeechAnalysisInput): AnalysisResult {
  return {
    wpm: computeWpm(input.transcript.words.length, input.audioDurationSec),
    fillerWords: detectFillerWords(input.transcript.words, input.language),
    slideTimeBreakdown: computeSlideTimeBreakdown(input.transitions, input.audioDurationSec),
    pronunciationIssues: [],
  };
}
