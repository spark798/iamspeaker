/**
 * TED-LIUM STM 전사로부터 "좋은 발표"의 WPM 분포를 측정한다(B-001 활용1, 품질 Q1-3).
 *
 * 라이선스: TED-LIUM은 CC BY-NC-ND 3.0 — **원문 전사/오디오는 저장하지 않는다.**
 * 이 모듈은 로컬 코퍼스에서 **메트릭 숫자(분포)만** 산출하며, 결과(평균·분위수)는
 * 저작물의 derivative가 아닌 사실 데이터다(benchmark.md §리서치 라이선스 결론).
 * 코퍼스 자체는 gated·대용량이라 repo에 번들하지 않는다 — 사용자가 `TEDLIUM_DIR`로 지정해 측정한다.
 *
 * STM 한 줄: `<file> <chan> <speaker> <start> <end> [<label>] transcript...`
 */

export interface StmSegment {
  file: string;
  startSec: number;
  endSec: number;
  wordCount: number;
}

/** 비-전사(점수 제외/무음 갭) 라벨 — 분포에서 제외. */
const SKIP_TRANSCRIPTS = new Set(["ignore_time_segment_in_scoring", "inter_segment_gap"]);

/**
 * STM 한 줄을 파싱한다. 주석·빈 줄·비전사 세그먼트는 null.
 * 라벨(`<...>`)은 선택적이며 전사에서 단어 수만 센다(원문은 보관하지 않음).
 */
export function parseStmLine(line: string): StmSegment | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(";;") || trimmed.startsWith("#")) return null;

  // 앞 5개 토큰(file chan speaker start end) 분리, 나머지는 라벨+전사.
  const parts = trimmed.split(/\s+/);
  if (parts.length < 6) return null;
  const [file, , , startStr, endStr, ...rest] = parts;
  const startSec = Number(startStr);
  const endSec = Number(endStr);
  if (!file || !Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
    return null;
  }

  // 선택적 라벨(`<...>`) 제거.
  let transcript = rest;
  if (transcript[0]?.startsWith("<")) transcript = transcript.slice(1);
  const text = transcript.join(" ").trim();
  if (!text || SKIP_TRANSCRIPTS.has(text.toLowerCase())) return null;

  // sclite 대안표기 `{ a / b }` 같은 메타 토큰은 단어 수에 과대 반영되지 않도록 기호 제거.
  const words = text.split(/\s+/).filter((w) => w && !["{", "}", "/", "@"].includes(w));
  if (words.length === 0) return null;

  return { file, startSec, endSec, wordCount: words.length };
}

export interface TalkStat {
  file: string;
  words: number;
  /** 발화(세그먼트) 합산 시간 — 무음/박수 제외 ≈ 말하기 속도. */
  voicedSec: number;
  /** 첫 시작~마지막 끝(벽시계). */
  spanSec: number;
}

/** 세그먼트들을 talk(file)별로 합산. */
export function aggregateTalks(segments: StmSegment[]): TalkStat[] {
  const byFile = new Map<string, { words: number; voiced: number; min: number; max: number }>();
  for (const s of segments) {
    const cur = byFile.get(s.file) ?? { words: 0, voiced: 0, min: s.startSec, max: s.endSec };
    cur.words += s.wordCount;
    cur.voiced += s.endSec - s.startSec;
    cur.min = Math.min(cur.min, s.startSec);
    cur.max = Math.max(cur.max, s.endSec);
    byFile.set(s.file, cur);
  }
  return [...byFile.entries()].map(([file, v]) => ({
    file,
    words: v.words,
    voicedSec: v.voiced,
    spanSec: v.max - v.min,
  }));
}

/** talk의 WPM. mode=voiced(말하기 속도, 기본) | span(벽시계). 0 이하 시간은 제외용으로 null. */
export function talkWpm(stat: TalkStat, mode: "voiced" | "span" = "voiced"): number | null {
  const sec = mode === "voiced" ? stat.voicedSec : stat.spanSec;
  if (sec <= 0) return null;
  return stat.words / (sec / 60);
}

/** 정렬된 배열에서 선형보간 분위수(p∈[0,1]). */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return Number.NaN;
  if (sortedAsc.length === 1) return sortedAsc[0] as number;
  const idx = p * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return (sortedAsc[lo] as number) * (1 - frac) + (sortedAsc[hi] as number) * frac;
}

export interface Distribution {
  n: number;
  mean: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

/** WPM 값 분포 요약. */
export function distribution(values: number[]): Distribution {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  const mean = n ? xs.reduce((a, b) => a + b, 0) / n : Number.NaN;
  return {
    n,
    mean,
    p10: percentile(xs, 0.1),
    p25: percentile(xs, 0.25),
    p50: percentile(xs, 0.5),
    p75: percentile(xs, 0.75),
    p90: percentile(xs, 0.9),
    min: xs[0] ?? Number.NaN,
    max: xs[n - 1] ?? Number.NaN,
  };
}

export interface SuggestedWpmBaseline {
  kind: "range";
  idealMin: number;
  idealMax: number;
  nonNativeIdealMin: number;
  nonNativeIdealMax: number;
  tolerance: number;
}

/**
 * 측정 분포 → 기준선 wpm 블록 제안.
 * - ideal 구간 = [p25, p75] (좋은 발표의 중앙 절반).
 * - tolerance = (p90−p10)/2 (분포 산포 기반 감점 완만화), 최소 15.
 * - 비원어민(L1) 보정 = ideal에서 `l1ShiftWpm` 하향(과속 방지 — benchmark.md §비원어민).
 *   측정값이 아니라 L1 가이드 기반 휴리스틱임을 명시한다.
 */
export function suggestWpmBaseline(dist: Distribution, l1ShiftWpm = 25): SuggestedWpmBaseline {
  const idealMin = Math.round(dist.p25);
  const idealMax = Math.round(dist.p75);
  const tolerance = Math.max(15, Math.round((dist.p90 - dist.p10) / 2));
  return {
    kind: "range",
    idealMin,
    idealMax,
    nonNativeIdealMin: idealMin - l1ShiftWpm,
    nonNativeIdealMax: idealMax - l1ShiftWpm,
    tolerance,
  };
}
