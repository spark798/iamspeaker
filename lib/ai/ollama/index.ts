import {
  LlmQaGenerator,
  LlmScriptGenerator,
  LlmSlideCritic,
  LlmTranslator,
} from "@/lib/ai/llm/adapters";
import { ollamaChatJson } from "./client";

// 정렬 유틸은 provider 공용 — 호환을 위해 ollama 경로에서도 재노출.
export { alignSegmentsToSlides } from "@/lib/ai/llm/adapters";

/**
 * 로컬 Ollama 어댑터 = provider-무관 Llm* 어댑터에 ollamaChatJson 주입(기본 엔진).
 * 프롬프트/스키마/정렬은 lib/ai/llm/adapters에서 공유, 호출만 Ollama HTTP.
 */
export class OllamaScriptGenerator extends LlmScriptGenerator {
  constructor() {
    super(ollamaChatJson);
  }
}
export class OllamaSlideCritic extends LlmSlideCritic {
  constructor() {
    super(ollamaChatJson);
  }
}
export class OllamaQaGenerator extends LlmQaGenerator {
  constructor() {
    super(ollamaChatJson);
  }
}
export class OllamaTranslator extends LlmTranslator {
  constructor() {
    super(ollamaChatJson);
  }
}
