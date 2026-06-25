/**
 * speechocean762(L2 영어 발음 코퍼스) 전문가 점수 대비 우리 발음 스코어러의 **절대 정확도**를
 * 측정한다(품질 Q1-4 잔여). 코퍼스는 퍼미시브 라이선스(OpenSLR 101)지만 대용량·모델 필요라
 * repo에 번들하지 않고 게이트로 측정한다(오케스트레이션 = scripts/eval-pronunciation.ts).
 *
 * 평가 granularity = **단어 단위**. 우리 스코어러는 단어별 이슈(confidence)를 내고,
 * speechocean762는 단어별 전문가 accuracy(0~10)를 주므로 IPA↔ARPAbet 음소 정렬 없이 비교 가능.
 * 이 모듈은 비교 수학(순수)만 담는다.
 */

export interface ScoWord {
  text: string;
  /** 전문가 단어 정확도 0~10. */
  accuracy: number;
  /** 오발음 라벨이 있는가(mispronunciations 비어있지 않음). */
  hasMispronunciation: boolean;
}

export interface ScoUtterance {
  id: string;
  text: string;
  /** 전문가 발화 정확도 0~10. */
  accuracy: number;
  words: ScoWord[];
}

/**
 * speechocean762 `resource/scores.json`(utt→점수)을 정규화한다.
 * 원문 텍스트는 단어 매칭에만 쓰고 저장하지 않는다(메트릭만 산출).
 */
export function parseSpeechocean(json: unknown): ScoUtterance[] {
  if (!json || typeof json !== "object") return [];
  const out: ScoUtterance[] = [];
  for (const [id, raw] of Object.entries(json as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const u = raw as Record<string, unknown>;
    const wordsRaw = Array.isArray(u.words) ? u.words : [];
    const words: ScoWord[] = wordsRaw.map((w) => {
      const wr = (w ?? {}) as Record<string, unknown>;
      const mis = Array.isArray(wr.mispronunciations) ? wr.mispronunciations : [];
      return {
        text: String(wr.text ?? "").toLowerCase(),
        accuracy: Number(wr.accuracy ?? 0),
        hasMispronunciation: mis.length > 0,
      };
    });
    out.push({
      id,
      text: String(u.text ?? ""),
      accuracy: Number(u.accuracy ?? 0),
      words,
    });
  }
  return out;
}

/**
 * 단어가 "오발음"인지의 정답 라벨: 전문가 accuracy가 임계 미만이거나 명시적 오발음 라벨이 있을 때.
 * speechocean762 word accuracy는 0~10 — 기본 임계 7(=양호 미만을 문제로).
 */
export function goldWordMispronounced(word: ScoWord, accuracyThreshold = 7): boolean {
  return word.hasMispronunciation || word.accuracy < accuracyThreshold;
}

/** 평균 순위(동점 평균) 기반 순위 — Spearman용. */
function averageRanks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]?.[0] === idx[i]?.[0]) j++;
    const avg = (i + j) / 2 + 1; // 1-기반 평균 순위
    for (let k = i; k <= j; k++) {
      const orig = idx[k]?.[1];
      if (orig !== undefined) ranks[orig] = avg;
    }
    i = j + 1;
  }
  return ranks;
}

/** Pearson 상관(순수). 표준편차 0이면 0. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return 0;
  return cov / Math.sqrt(vx * vy);
}

/** Spearman 순위 상관 — 우리 점수가 전문가 점수와 같은 방향으로 움직이는지(단조성). */
export function spearman(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  return pearson(averageRanks(xs.slice(0, n)), averageRanks(ys.slice(0, n)));
}
