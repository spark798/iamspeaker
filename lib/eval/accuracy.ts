import { fillerPositions } from "@/lib/analysis/speech";

/** 이진 분류 정밀도/재현율/F1(양성=필러). 순수 함수. */
export interface PRF {
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  fn: number;
}

export function prf(predicted: boolean[], gold: boolean[]): PRF {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const n = Math.min(predicted.length, gold.length);
  for (let i = 0; i < n; i++) {
    if (predicted[i] && gold[i]) tp++;
    else if (predicted[i] && !gold[i]) fp++;
    else if (!predicted[i] && gold[i]) fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, tp, fp, fn };
}

/** 정확도 정답셋의 한 샘플(라벨된 전사). fillerIndices = 정답 필러 위치. */
export interface FillerSample {
  id: string;
  language: string;
  words: string[];
  fillerIndices: number[];
}

/** 현재 필러 검출(fillerPositions)을 정답셋에 대해 평가 → 전체 PRF + 미검출(누락) 단어. */
export function evalFillers(samples: FillerSample[]): {
  overall: PRF;
  missed: string[]; // 정답인데 못 잡은 단어(재현율 갭 진단)
} {
  const predicted: boolean[] = [];
  const gold: boolean[] = [];
  const missed: string[] = [];
  for (const s of samples) {
    const goldSet = new Set(s.fillerIndices);
    const predSet = new Set(fillerPositions(s.words, s.language).map((p) => p.index));
    s.words.forEach((w, i) => {
      const p = predSet.has(i);
      const g = goldSet.has(i);
      predicted.push(p);
      gold.push(g);
      if (g && !p) missed.push(w);
    });
  }
  return { overall: prf(predicted, gold), missed };
}
