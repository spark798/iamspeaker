import type { Baseline, Genre } from "@/lib/domain";
import { z } from "zod";
import lectureBaseline from "./lecture.json";
import pitchBaseline from "./pitch.json";
import talkBaseline from "./talk.json";

/**
 * 발표 품질 기준선 로더(B-001). 장르별 JSON을 Zod로 검증해 반환.
 * 메트릭 숫자만 보관(원문 0). 장르 확장 = JSON 추가.
 */
const RangeSpec = z.object({
  kind: z.literal("range"),
  idealMin: z.number(),
  idealMax: z.number(),
  nonNativeIdealMin: z.number().optional(),
  nonNativeIdealMax: z.number().optional(),
  tolerance: z.number().positive(),
});
const LowerBetterSpec = z.object({
  kind: z.literal("lowerBetter"),
  ideal: z.number(),
  hard: z.number(),
});
const UpperLimitSpec = z.object({
  kind: z.literal("upperLimit"),
  limit: z.number(),
  hard: z.number(),
});

const BaselineSchema = z.object({
  genre: z.enum(["talk", "pitch", "lecture"]),
  source: z.string().min(1),
  metrics: z.object({
    wpm: RangeSpec.optional(),
    fillerPerMin: LowerBetterSpec.optional(),
    pausePerMin: RangeSpec.optional(),
    slideWordsPerSlide: UpperLimitSpec.optional(),
  }),
});

const BASELINES: Record<Genre, unknown> = {
  talk: talkBaseline,
  pitch: pitchBaseline,
  lecture: lectureBaseline,
};

/** 장르 기준선. 알 수 없는 장르는 talk로 폴백. */
export function loadBaseline(genre: Genre = "talk"): Baseline {
  const raw = BASELINES[genre] ?? BASELINES.talk;
  return BaselineSchema.parse(raw) as Baseline;
}
