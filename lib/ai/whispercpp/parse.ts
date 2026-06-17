import type { TranscriptResult } from "@/lib/domain";
import { z } from "zod";

/**
 * whisper-cli `-oj` JSON 파서(미신뢰 외부 출력 → Zod 검증).
 * `-ml 1 -sow`로 실행하면 각 transcription 세그먼트가 단어 1개에 근접 → word-level 타임스탬프로 사용.
 * offsets는 밀리초. 기본 confidence는 1(세그먼트 JSON엔 확률 없음 — 발음 평가용 토큰 확률은 추후 -ojf).
 */
const WhisperJsonSchema = z.object({
  transcription: z.array(
    z.object({
      offsets: z.object({ from: z.coerce.number(), to: z.coerce.number() }),
      text: z.string(),
    }),
  ),
});

export function parseWhisperJson(raw: unknown): TranscriptResult {
  const { transcription } = WhisperJsonSchema.parse(raw);
  const words = transcription
    .map((seg) => ({
      word: seg.text.trim(),
      startSec: seg.offsets.from / 1000,
      endSec: seg.offsets.to / 1000,
      confidence: 1,
    }))
    .filter((w) => w.word.length > 0);

  return {
    text: words.map((w) => w.word).join(" "),
    words,
    durationSec: words.length > 0 ? (words[words.length - 1]?.endSec ?? 0) : 0,
  };
}
