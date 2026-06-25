import {
  aggregateTalks,
  distribution,
  parseStmLine,
  percentile,
  suggestWpmBaseline,
  talkWpm,
} from "@/lib/eval/ted-baseline";
import { describe, expect, it } from "vitest";

describe("parseStmLine", () => {
  it("정상 STM 라인에서 file/시간/단어수 추출(라벨 있음)", () => {
    const s = parseStmLine("TalkA 1 spkA 10.0 20.0 <o,f0,female> hello there my friends");
    expect(s).toEqual({ file: "TalkA", startSec: 10, endSec: 20, wordCount: 4 });
  });

  it("라벨 없는 라인도 처리", () => {
    const s = parseStmLine("TalkB 1 spkB 0.0 6.0 one two three");
    expect(s).toMatchObject({ file: "TalkB", wordCount: 3 });
  });

  it("주석·빈 줄·비전사 세그먼트는 null", () => {
    expect(parseStmLine(";; comment")).toBeNull();
    expect(parseStmLine("# comment")).toBeNull();
    expect(parseStmLine("   ")).toBeNull();
    expect(parseStmLine("TalkA 1 spkA 1.0 2.0 ignore_time_segment_in_scoring")).toBeNull();
    expect(parseStmLine("TalkA 1 spkA 1.0 2.0 <o> inter_segment_gap")).toBeNull();
  });

  it("시간이 비정상(끝<=시작)이면 null", () => {
    expect(parseStmLine("TalkA 1 spkA 5.0 5.0 word")).toBeNull();
    expect(parseStmLine("TalkA 1 spkA 9.0 5.0 word")).toBeNull();
  });
});

describe("aggregateTalks / talkWpm", () => {
  it("talk별 단어·voiced·span 합산 후 WPM 계산", () => {
    const segs = [
      { file: "T", startSec: 0, endSec: 30, wordCount: 75 }, // 30s
      { file: "T", startSec: 40, endSec: 70, wordCount: 75 }, // 30s, gap 10s
    ];
    const stats = aggregateTalks(segs);
    const stat = stats[0];
    if (!stat) throw new Error("expected one talk");
    expect(stat).toMatchObject({ file: "T", words: 150, voicedSec: 60, spanSec: 70 });
    // voiced: 150 words / (60s/60) = 150 wpm
    expect(talkWpm(stat, "voiced")).toBeCloseTo(150, 5);
    // span: 150 / (70/60) ≈ 128.6 wpm
    expect(talkWpm(stat, "span")).toBeCloseTo(128.57, 1);
  });
});

describe("percentile / distribution", () => {
  it("선형보간 분위수", () => {
    const xs = [10, 20, 30, 40, 50];
    expect(percentile(xs, 0)).toBe(10);
    expect(percentile(xs, 0.5)).toBe(30);
    expect(percentile(xs, 1)).toBe(50);
    expect(percentile(xs, 0.25)).toBe(20);
  });

  it("분포 요약(n/mean/분위수)", () => {
    const d = distribution([100, 120, 140, 160, 180]);
    expect(d.n).toBe(5);
    expect(d.mean).toBe(140);
    expect(d.p50).toBe(140);
    expect(d.min).toBe(100);
    expect(d.max).toBe(180);
  });
});

describe("suggestWpmBaseline", () => {
  it("p25~p75를 ideal로, 비원어민은 하향, tolerance는 산포 기반(최소 15)", () => {
    const d = distribution([120, 140, 150, 160, 170, 180, 200]);
    const s = suggestWpmBaseline(d, 25);
    expect(s.kind).toBe("range");
    expect(s.idealMin).toBe(Math.round(d.p25));
    expect(s.idealMax).toBe(Math.round(d.p75));
    expect(s.nonNativeIdealMin).toBe(s.idealMin - 25);
    expect(s.nonNativeIdealMax).toBe(s.idealMax - 25);
    expect(s.tolerance).toBeGreaterThanOrEqual(15);
  });
});
