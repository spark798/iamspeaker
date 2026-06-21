import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TtsAdapter, TtsResult } from "@/lib/ai/types";
import { config } from "@/lib/config";

/**
 * 로컬 Piper TTS 어댑터(기본 TTS 엔진). 텍스트 → 22.05kHz mono WAV.
 * 보이스 모델은 `PIPER_VOICE_DIR/<voice>.onnx`(+ `.onnx.json`). 텍스트는 stdin으로 전달.
 * 외부 프로세스는 배열 인자 spawn(셸 보간 금지, 보안 §10).
 */
export class PiperTts implements TtsAdapter {
  /** lang은 향후 보이스 매핑용(현재는 PIPER_DEFAULT_VOICE 단일). */
  async synthesize(text: string, _lang: string): Promise<TtsResult> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("합성할 텍스트가 비어 있습니다");

    const dir = mkdtempSync(join(tmpdir(), "iamspeaker-tts-"));
    const outPath = join(dir, "out.wav");
    try {
      await this.run(trimmed, outPath);
      const audio = new Uint8Array(readFileSync(outPath));
      return { audio, format: "wav", sampleRate: 22050 };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  private modelPath(): string {
    return join(config.PIPER_VOICE_DIR, `${config.PIPER_DEFAULT_VOICE}.onnx`);
  }

  private run(text: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ["-m", this.modelPath(), "-f", outPath];
      const proc = spawn(config.PIPER_BIN, args, { stdio: ["pipe", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`piper 실패 (code ${code}): ${stderr.slice(-300)}`));
      });
      proc.stdin.write(text);
      proc.stdin.end();
    });
  }
}
