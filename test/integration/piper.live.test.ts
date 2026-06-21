import { PiperTts } from "@/lib/ai/piper";
import { describe } from "vitest";
import { runTtsContract } from "../contract/adapter-contracts";

/**
 * 실제 로컬 Piper에 대한 TTS 어댑터 계약 검증.
 * 기본 SKIP — piper 바이너리 + 보이스 모델이 있는 환경에서만:
 *   `PIPER_LIVE=1 PIPER_BIN=<path> PIPER_VOICE_DIR=./data/models/piper PIPER_DEFAULT_VOICE=en_US-amy-medium pnpm test`
 */
const live = process.env.PIPER_LIVE === "1";
const TTS_TIMEOUT_MS = 30_000;

describe.runIf(live)("Piper TTS 계약 (live)", () => {
  runTtsContract("piper", () => new PiperTts(), TTS_TIMEOUT_MS);
});
