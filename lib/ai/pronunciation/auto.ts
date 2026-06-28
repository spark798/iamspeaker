import type {
  PronunciationInput,
  PronunciationResult,
  PronunciationScorerAdapter,
} from "@/lib/ai/types";
import { HeuristicPronunciationScorer } from "./heuristic";
import { gopAvailable } from "./probe";
import { Wav2Vec2PronunciationScorer } from "./wav2vec2";

/**
 * 자동 승격 스코어러 — 구성은 cheap(프로브 없음). 첫 detect()에서 GOP 가용 여부를 1회 프로브(캐시)하고
 * wav2vec2(가용)·heuristic(아니면)에 위임. 이후 동일 delegate 재사용.
 */
export class AutoPronunciationScorer implements PronunciationScorerAdapter {
  private delegate?: PronunciationScorerAdapter;

  detect(input: PronunciationInput): Promise<PronunciationResult> {
    if (!this.delegate) {
      this.delegate = gopAvailable()
        ? new Wav2Vec2PronunciationScorer()
        : new HeuristicPronunciationScorer();
    }
    return this.delegate.detect(input);
  }
}
