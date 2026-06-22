import {
  LlmQaGenerator,
  LlmScriptGenerator,
  LlmSlideCritic,
  LlmTranslator,
} from "@/lib/ai/llm/adapters";
import { type ChatJson, claudeChatJson, openaiChatJson } from "@/lib/ai/llm/client";
import { ollamaChatJson } from "@/lib/ai/ollama/client";
import { PiperTts } from "@/lib/ai/piper";
import { StubStt, StubTranslator, StubTts, stubAdapters } from "@/lib/ai/stub";
import type {
  Adapters,
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  SttAdapter,
  TranslatorAdapter,
  TtsAdapter,
} from "@/lib/ai/types";
import { WhisperCppStt } from "@/lib/ai/whispercpp";
import { config, engines } from "@/lib/config";

/**
 * 어댑터 팩토리 — 항상 인터페이스/팩토리 경유로 어댑터를 얻는다(직접 호출 금지).
 *
 * LLM(script/qa/slideCritic/translator): engines.script로 provider 선택(클라우드 키 우선, 없으면 Ollama).
 *   프롬프트/스키마/정렬은 공유하고 호출만 provider별 ChatJson이 담당.
 * STT: 로컬 Whisper.cpp. TTS: Piper.
 * 테스트/CI/E2E는 `USE_STUB_ADAPTERS=1`로 stub 강제 → 모델 없이 결정적 통과.
 */
function llmChat(): ChatJson {
  switch (engines.script) {
    case "claude":
      return claudeChatJson;
    case "openai":
      return openaiChatJson;
    default:
      return ollamaChatJson;
  }
}

export function getScriptGenerator(): ScriptGeneratorAdapter {
  return new LlmScriptGenerator(llmChat());
}

export function getQaGenerator(): QaGeneratorAdapter {
  return new LlmQaGenerator(llmChat());
}

export function getSlideCritic(): SlideCriticAdapter {
  return new LlmSlideCritic(llmChat());
}

export function getTranslator(): TranslatorAdapter {
  if (config.USE_STUB_ADAPTERS) return new StubTranslator();
  return new LlmTranslator(llmChat());
}

export function getTts(): TtsAdapter {
  if (config.USE_STUB_ADAPTERS) return new StubTts();
  return new PiperTts();
}

export function getStt(): SttAdapter {
  if (config.USE_STUB_ADAPTERS) return new StubStt();
  return new WhisperCppStt();
}

export function getAdapters(): Adapters {
  // 테스트/E2E: 모델 없이 결정적 동작을 위해 전체 stub.
  if (config.USE_STUB_ADAPTERS) return stubAdapters();
  return {
    script: getScriptGenerator(),
    tts: getTts(),
    stt: getStt(),
    qa: getQaGenerator(),
    slideCritic: getSlideCritic(),
    translator: getTranslator(),
  };
}
