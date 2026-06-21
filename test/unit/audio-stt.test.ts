import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWhisperJson } from "@/lib/ai/whispercpp/parse";
import { readWavDurationSec } from "@/lib/audio";
import { describe, expect, it } from "vitest";

/** 16kHz mono 16-bit 캐노니컬 WAV(무음) 생성 — samples/16000 초. */
function writeWav(samples: number): string {
  const sampleRate = 16000;
  const dataLen = samples * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataLen, 40);
  const p = join(tmpdir(), `iamspeaker-wav-${samples}.wav`);
  writeFileSync(p, buf);
  return p;
}

describe("readWavDurationSec", () => {
  it("data 청크 크기/byteRate로 길이 계산", () => {
    expect(readWavDurationSec(writeWav(16000))).toBeCloseTo(1.0, 5);
    expect(readWavDurationSec(writeWav(8000))).toBeCloseTo(0.5, 5);
  });
});

describe("parseWhisperJson", () => {
  it("세그먼트(단어)를 word-level transcript로 매핑", () => {
    const raw = {
      transcription: [
        { offsets: { from: 0, to: 400 }, text: " Hello" },
        { offsets: { from: 400, to: 900 }, text: " world" },
        { offsets: { from: 900, to: 1500 }, text: " test" },
      ],
    };
    const r = parseWhisperJson(raw);
    expect(r.text).toBe("Hello world test");
    expect(r.words).toHaveLength(3);
    expect(r.words[0]).toEqual({ word: "Hello", startSec: 0, endSec: 0.4, confidence: 1 });
    expect(r.durationSec).toBe(1.5);
  });

  it("빈/공백 세그먼트는 제외", () => {
    const r = parseWhisperJson({
      transcription: [
        { offsets: { from: 0, to: 100 }, text: "  " },
        { offsets: { from: 100, to: 500 }, text: "hi" },
      ],
    });
    expect(r.words).toHaveLength(1);
    expect(r.text).toBe("hi");
  });

  it("토큰 확률(p)이 있으면 단어 confidence로 평균", () => {
    const r = parseWhisperJson({
      transcription: [
        { offsets: { from: 0, to: 400 }, text: " Hello", tokens: [{ text: "Hello", p: 0.8 }] },
        {
          offsets: { from: 400, to: 900 },
          text: " coffee",
          tokens: [
            { text: "[_BEG_]", p: 0.99 },
            { text: "cof", p: 0.4 },
            { text: "fee", p: 0.6 },
          ],
        },
      ],
    });
    expect(r.words[0]?.confidence).toBe(0.8);
    // 특수 토큰([_BEG_])은 제외 → (0.4+0.6)/2 = 0.5
    expect(r.words[1]?.confidence).toBe(0.5);
  });

  it("토큰이 없으면 confidence=1", () => {
    const r = parseWhisperJson({
      transcription: [{ offsets: { from: 0, to: 400 }, text: " Hi" }],
    });
    expect(r.words[0]?.confidence).toBe(1);
  });

  it("형식이 어긋나면 throw", () => {
    expect(() => parseWhisperJson({ foo: 1 })).toThrow();
  });
});
