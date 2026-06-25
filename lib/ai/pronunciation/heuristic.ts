import type {
  PronunciationInput,
  PronunciationResult,
  PronunciationScorerAdapter,
} from "@/lib/ai/types";
import { pronunciationScore } from "@/lib/analysis/pronunciation";
import { detectPronunciationIssues } from "@/lib/analysis/speech";

/**
 * 기본 발음 검출기 — STT confidence + L1 음소 글자 교차(의존성 0, 항상 동작).
 * 정밀 음향 평가는 Wav2Vec2PronunciationScorer(옵션).
 */
export class HeuristicPronunciationScorer implements PronunciationScorerAdapter {
  async detect(input: PronunciationInput): Promise<PronunciationResult> {
    return {
      issues: detectPronunciationIssues(input.words, input.l1Profile),
      // STT confidence를 발음 정확도 대용으로(휴리스틱 폴백).
      score: pronunciationScore(input.words.map((w) => w.confidence)),
    };
  }
}
