import { OllamaQaGenerator, OllamaScriptGenerator, OllamaSlideCritic } from "@/lib/ai/ollama";
import { describe } from "vitest";
import {
  runQaContract,
  runScriptGeneratorContract,
  runSlideCriticContract,
} from "../contract/adapter-contracts";

/**
 * 실제 로컬 Ollama에 대한 어댑터 계약 검증.
 * 기본 SKIP — 모델/서버가 있는 환경에서만 실행: `OLLAMA_LIVE=1 OLLAMA_MODEL=<tag> pnpm test`.
 * (LLM 출력은 비결정적이므로 계약은 "스키마/형태"만 검사한다.)
 */
const live = process.env.OLLAMA_LIVE === "1";

describe.runIf(live)("Ollama 어댑터 계약 (live)", () => {
  runScriptGeneratorContract("ollama", () => new OllamaScriptGenerator());
  runSlideCriticContract("ollama", () => new OllamaSlideCritic());
  runQaContract("ollama", () => new OllamaQaGenerator());
});
