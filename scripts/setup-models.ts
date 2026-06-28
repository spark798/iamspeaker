/**
 * 로컬 모델 다운로드. 실행: `pnpm setup:models`
 * - Whisper.cpp ggml 모델 → WHISPER_MODEL_PATH
 * - Piper voice(.onnx, .onnx.json) → PIPER_VOICE_DIR
 * 이미 존재하면 건너뛴다(멱등).
 */
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값
}

const { config } = await import("../lib/config");

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, dest: string): Promise<void> {
  if (await exists(dest)) {
    console.log(`✓ 이미 있음: ${dest}`);
    return;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`다운로드 실패 (${res.status}): ${url}`);
  }
  await pipeline(
    Readable.fromWeb(res.body as WebReadableStream<Uint8Array>),
    createWriteStream(dest),
  );
  console.log(`✓ 저장: ${dest}`);
}

/** "en_US-amy-medium" → Piper voice 파일 URL 2개(.onnx, .onnx.json). */
function piperUrls(voice: string): { onnx: string; json: string } {
  const [locale, name, quality] = voice.split("-");
  if (!locale || !name || !quality) {
    throw new Error(`Piper voice 형식 오류: ${voice} (예: en_US-amy-medium)`);
  }
  const lang = locale.split("_")[0];
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${lang}/${locale}/${name}/${quality}`;
  return { onnx: `${base}/${voice}.onnx`, json: `${base}/${voice}.onnx.json` };
}

/** voice 모델(.onnx + .onnx.json)을 PIPER_VOICE_DIR로 받는다. */
async function downloadVoice(voice: string): Promise<void> {
  const { onnx, json } = piperUrls(voice);
  await download(onnx, path.join(config.PIPER_VOICE_DIR, `${voice}.onnx`));
  await download(json, path.join(config.PIPER_VOICE_DIR, `${voice}.onnx.json`));
}

const whisperUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

await download(whisperUrl, config.WHISPER_MODEL_PATH);
// 데모 음성: 영어 여성(기본)+남성 + 번역본 TTS용 es/zh(Piper는 ko/ja 없음). 빈 값/중복은 건너뜀.
const voices = [
  config.PIPER_DEFAULT_VOICE,
  config.PIPER_MALE_VOICE,
  config.PIPER_VOICE_ES,
  config.PIPER_VOICE_ZH,
].filter(Boolean);
for (const voice of new Set(voices)) {
  await downloadVoice(voice);
}

console.log("\n✅ 모델 준비 완료. 'pnpm preflight'로 점검하세요.\n");
