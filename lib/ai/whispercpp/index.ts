import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SttAdapter, SttInput } from "@/lib/ai/types";
import { config } from "@/lib/config";
import type { TranscriptResult } from "@/lib/domain";
import { parseWhisperJson } from "./parse";

export { parseWhisperJson } from "./parse";

/**
 * 로컬 Whisper.cpp(whisper-cli) STT 어댑터. 16kHz mono WAV(오디오 파이프라인 산출)을 전사.
 * `-ml 1 -sow`로 word-level에 근접한 세그먼트를 얻어 JSON으로 파싱.
 */
export class WhisperCppStt implements SttAdapter {
  async transcribe(input: SttInput): Promise<TranscriptResult> {
    const dir = mkdtempSync(join(tmpdir(), "iamspeaker-stt-"));
    const outBase = join(dir, "out");
    try {
      await this.run(input.wavFilePath, outBase);
      const json = JSON.parse(readFileSync(`${outBase}.json`, "utf8"));
      return parseWhisperJson(json);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  private run(wavFilePath: string, outBase: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "-m",
        config.WHISPER_MODEL_PATH,
        "-f",
        wavFilePath,
        "-oj",
        "-ojf",
        "-of",
        outBase,
        "-ml",
        "1",
        "-sow",
        "-nt",
      ];
      const proc = spawn(config.WHISPER_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`whisper-cli 실패 (code ${code}): ${stderr.slice(-300)}`));
      });
    });
  }
}
