import { z } from "zod";
import type { TranscriptResult } from "@/lib/domain";

/**
 * whisper-cli JSON 파서(미신뢰 외부 출력 → Zod 검증).
 * `-ml 1 -sow`로 각 transcription 세그먼트가 단어 1개에 근접 → word-level 타임스탬프.
 * `-ojf`(full)면 segment.tokens[].p(토큰 확률)가 포함 → 단어 confidence = 비특수 토큰 평균 확률.
 * offsets는 밀리초.
 */
const WhisperJsonSchema = z.object({
  transcription: z.array(
    z.object({
      offsets: z.object({ from: z.coerce.number(), to: z.coerce.number() }),
      text: z.string(),
      tokens: z
        .array(z.object({ text: z.string(), p: z.coerce.number().optional() }))
        .optional(),
    }),
  ),
});

/** 비특수 토큰([_BEG_], <|...|> 등 제외)의 평균 확률. 없으면 1. */
function segmentConfidence(tokens?: { text: string; p?: number }[]): number {
  if (!tokens) return 1;
  const ps = tokens
    .filter((t) => !/^\s*[[<]/.test(t.text) && typeof t.p === "number")
    .map((t) => t.p as number);
  if (ps.length === 0) return 1;
  return Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) / 100;
}

export function parseWhisperJson(raw: unknown): TranscriptResult {
  const { transcription } = WhisperJsonSchema.parse(raw);
  const words = transcription
    .map((seg) => ({
      word: seg.text.trim(),
      startSec: seg.offsets.from / 1000,
      endSec: seg.offsets.to / 1000,
      confidence: segmentConfidence(seg.tokens),
    }))
    .filter((w) => w.word.length > 0);

  return {
    text: words.map((w) => w.word).join(" "),
    words,
    durationSec: words.length > 0 ? (words[words.length - 1]?.endSec ?? 0) : 0,
  };
}
