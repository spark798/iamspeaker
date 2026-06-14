import {
  StubQaGenerator,
  StubScriptGenerator,
  StubSlideCritic,
  StubStt,
  StubTts,
} from "@/lib/ai/stub";
import type {
  Adapters,
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  SttAdapter,
  TtsAdapter,
} from "@/lib/ai/types";

/**
 * 어댑터 팩토리 — 항상 인터페이스/팩토리 경유로 어댑터를 얻는다(직접 호출 금지).
 *
 * Phase 0: 실제 로컬/클라우드 구현 전까지 stub을 반환(Walking Skeleton·CI).
 * Phase 1: `engines`(lib/config의 deriveEngines)에 따라 실제 구현 선택 + 로컬 폴백으로 교체.
 *   각 케이스의 반환만 바뀌고 인터페이스/계약(test/contract)은 동일하게 유지된다.
 */

export function getScriptGenerator(): ScriptGeneratorAdapter {
  return new StubScriptGenerator();
}

export function getTts(): TtsAdapter {
  return new StubTts();
}

export function getStt(): SttAdapter {
  return new StubStt();
}

export function getQaGenerator(): QaGeneratorAdapter {
  return new StubQaGenerator();
}

export function getSlideCritic(): SlideCriticAdapter {
  return new StubSlideCritic();
}

export function getAdapters(): Adapters {
  return {
    script: getScriptGenerator(),
    tts: getTts(),
    stt: getStt(),
    qa: getQaGenerator(),
    slideCritic: getSlideCritic(),
  };
}
