import type { PronunciationInput, PronunciationScorerAdapter } from "@/lib/ai/types";
import { detectPronunciationIssues } from "@/lib/analysis/speech";
import type { PronunciationIssue } from "@/lib/domain";

/**
 * 기본 발음 검출기 — STT confidence + L1 음소 글자 교차(의존성 0, 항상 동작).
 * 정밀 음향 평가는 Wav2Vec2PronunciationScorer(옵션).
 */
export class HeuristicPronunciationScorer implements PronunciationScorerAdapter {
  async detect(input: PronunciationInput): Promise<PronunciationIssue[]> {
    return detectPronunciationIssues(input.words, input.l1Profile);
  }
}
