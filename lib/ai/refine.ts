import type { ScriptGeneratorAdapter } from "@/lib/ai/types";
import type { Baseline, GenOptions, Script, SlideContent } from "@/lib/domain";
import { scoreScriptQuality } from "@/lib/eval/script-quality";

export interface RefineResult {
  script: Script;
  /** 채택된 스크립트의 종합 품질(0~100). */
  overall: number;
  /** 시도 횟수(1=재시도 없음). */
  attempts: number;
}

/**
 * 자가개선 루프(B-001 활용2). 생성 → 자가 채점(scoreScriptQuality) → 분량이 기준선에서 벗어나면
 * lengthBias 보정 지시로 재생성 → 더 나은 쪽 채택. 파인튜닝 없이 출력 품질을 수렴시킨다.
 *
 * maxRetries 만큼만 추가 호출(비용 상한). stub처럼 이미 적정이면 즉시 반환.
 */
export async function generateWithRefinement(
  gen: ScriptGeneratorAdapter,
  slides: SlideContent[],
  options: GenOptions,
  baseline: Baseline,
  maxRetries = 1,
): Promise<RefineResult> {
  const nonNative = !!options.nativeLanguage && options.nativeLanguage !== options.language;
  const score = (s: Script) =>
    scoreScriptQuality(slides, s, options.targetDurationSec, baseline, nonNative);

  let best = await gen.generate(slides, options);
  let bestQ = score(best);
  let attempts = 1;

  for (let i = 0; i < maxRetries; i++) {
    // 분량이 적정(ideal)이면 더 손대지 않는다.
    if (bestQ.wpmBand === "ideal") break;
    const lengthBias = bestQ.wpmBand === "low" ? "expand" : "condense";
    const retry = await gen.generate(slides, { ...options, lengthBias });
    attempts++;
    const retryQ = score(retry);
    // overall이 더 높으면 채택. 단 분량 미달/초과로 overall이 둘 다 0에 붙어 구분이 안 될 때는
    // 커버리지 손실 없이 바이어스 방향(expand=더 많이, condense=더 적게)으로 움직였으면 채택.
    const directionImproved =
      retryQ.coverage >= bestQ.coverage &&
      (lengthBias === "expand"
        ? retryQ.totalWords > bestQ.totalWords
        : retryQ.totalWords < bestQ.totalWords);
    if (retryQ.overall > bestQ.overall || (retryQ.overall === bestQ.overall && directionImproved)) {
      best = retry;
      bestQ = retryQ;
    }
  }

  return { script: best, overall: bestQ.overall, attempts };
}
