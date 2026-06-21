import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { config } from "@/lib/config";

/**
 * 브라우저 MediaRecorder 산출물(webm/opus 등)을 Whisper 입력 규격(16kHz mono 16-bit WAV)으로 정규화.
 * 외부 프로세스는 배열 인자 spawn(셸 보간 금지, 보안 §10).
 */
export function normalizeToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ];
    const proc = spawn(config.FFMPEG_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 정규화 실패 (code ${code}): ${stderr.slice(-400)}`));
    });
  });
}

/** ffmpeg silencedetect stderr에서 묵음 구간 개수를 센다(각 silence_start 1회). 순수 파서(테스트용). */
export function parseSilenceCount(stderr: string): number {
  return (stderr.match(/silence_start:/g) ?? []).length;
}

/**
 * 오디오에서 일정 길이 이상의 묵음(pause) 개수를 센다. ffmpeg silencedetect 필터 기반.
 * word timestamp(whisper -ml 1)는 gap이 붕괴돼 부정확 → 오디오에서 직접 측정(STT 독립).
 */
export function countSilences(
  wavPath: string,
  minSilenceSec = 0.6,
  noiseDb = -30,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      wavPath,
      "-af",
      `silencedetect=n=${noiseDb}dB:d=${minSilenceSec}`,
      "-f",
      "null",
      "-",
    ];
    const proc = spawn(config.FFMPEG_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(parseSilenceCount(stderr));
      else reject(new Error(`ffmpeg silencedetect 실패 (code ${code}): ${stderr.slice(-300)}`));
    });
  });
}

/** 캐노니컬 WAV(PCM) 헤더에서 재생 길이(초)를 읽는다. byteRate(offset 28) + data 청크 크기 기반. */
export function readWavDurationSec(wavPath: string): number {
  const buf = readFileSync(wavPath);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("유효한 WAV 파일이 아닙니다");
  }
  const byteRate = buf.readUInt32LE(28);
  // 'data' 서브청크 탐색(표준 44바이트 헤더가 아닐 수도 있으므로 스캔).
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      return byteRate > 0 ? size / byteRate : 0;
    }
    offset += 8 + size + (size % 2);
  }
  return 0;
}
