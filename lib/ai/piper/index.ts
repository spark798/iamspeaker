import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TtsAdapter, TtsResult, TtsVoice } from "@/lib/ai/types";
import { config } from "@/lib/config";

/**
 * 언어(+영어면 female/male) → 설정된 Piper voice 모델 id. 보이스 없는 언어는 빈 문자열.
 * en=PIPER_DEFAULT/MALE_VOICE, es=PIPER_VOICE_ES, zh=PIPER_VOICE_ZH. (Piper에 ko/ja 보이스 없음)
 */
export function piperVoiceModel(lang?: string, voice?: TtsVoice): string {
  if (!lang || lang === "en") {
    return voice === "male" ? config.PIPER_MALE_VOICE : config.PIPER_DEFAULT_VOICE;
  }
  if (lang === "es") return config.PIPER_VOICE_ES;
  if (lang === "zh") return config.PIPER_VOICE_ZH;
  return "";
}

/** 해당 언어로 번역본 TTS가 가능한지(보이스 설정 존재). */
export function hasVoiceForLang(lang: string): boolean {
  return piperVoiceModel(lang) !== "";
}

/**
 * 로컬 Piper TTS 어댑터(기본 TTS 엔진). 텍스트 → 22.05kHz mono WAV.
 * 보이스 모델은 `PIPER_VOICE_DIR/<voice>.onnx`(+ `.onnx.json`). 텍스트는 stdin으로 전달.
 * 외부 프로세스는 배열 인자 spawn(셸 보간 금지, 보안 §10).
 */
export class PiperTts implements TtsAdapter {
  /** lang으로 보이스 모델 선택(en이면 voice=female/male). 보이스 없는 언어는 에러. */
  async synthesize(text: string, lang: string, voice?: TtsVoice): Promise<TtsResult> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("합성할 텍스트가 비어 있습니다");
    const model = piperVoiceModel(lang, voice);
    if (!model) throw new Error(`'${lang}' 언어용 Piper 보이스가 없습니다`);

    const dir = mkdtempSync(join(tmpdir(), "iamspeaker-tts-"));
    const outPath = join(dir, "out.wav");
    try {
      await this.run(trimmed, outPath, model);
      const audio = new Uint8Array(readFileSync(outPath));
      return { audio, format: "wav", sampleRate: 22050 };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  private run(text: string, outPath: string, model: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ["-m", join(config.PIPER_VOICE_DIR, `${model}.onnx`), "-f", outPath];
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
