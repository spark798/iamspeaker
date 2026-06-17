import { OllamaQaGenerator, OllamaScriptGenerator, OllamaSlideCritic } from "@/lib/ai/ollama";
import { StubStt, StubTts, stubAdapters } from "@/lib/ai/stub";
import type {
  Adapters,
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  SttAdapter,
  TtsAdapter,
} from "@/lib/ai/types";
import { config, engines } from "@/lib/config";

/**
 * 어댑터 팩토리 — 항상 인터페이스/팩토리 경유로 어댑터를 얻는다(직접 호출 금지).
 *
 * LLM(script/qa/slideCritic): 로컬 Ollama 기본.
 *   Phase 2에서 ANTHROPIC_API_KEY/OPENAI_API_KEY가 있으면 클라우드 구현으로 교체(engines 참조).
 * 오디오(tts/stt): 아직 stub. Phase 1 오디오 단계에서 Piper/Whisper.cpp로 교체.
 * 테스트/CI는 stub을 명시 주입(`stubAdapters()`)해 모델 없이 통과한다.
 */
export function getScriptGenerator(): ScriptGeneratorAdapter {
  switch (engines.script) {
    // TODO(Phase 2): case "claude" → ClaudeScriptGenerator, case "openai" → OpenAIScriptGenerator
    default:
      return new OllamaScriptGenerator();
  }
}

export function getQaGenerator(): QaGeneratorAdapter {
  switch (engines.script) {
    // TODO(Phase 2): 클라우드 LLM 구현
    default:
      return new OllamaQaGenerator();
  }
}

export function getSlideCritic(): SlideCriticAdapter {
  switch (engines.script) {
    // TODO(Phase 2): 클라우드 LLM 구현
    default:
      return new OllamaSlideCritic();
  }
}

export function getTts(): TtsAdapter {
  return new StubTts(); // TODO(Phase 1 audio): PiperTts
}

export function getStt(): SttAdapter {
  return new StubStt(); // TODO(Phase 1 audio): WhisperCppStt
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
  };
}
