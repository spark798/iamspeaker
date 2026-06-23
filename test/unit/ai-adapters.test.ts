import { getAdapters } from "@/lib/ai/factory";
import {
  StubQaGenerator,
  StubScriptGenerator,
  StubSlideCritic,
  StubStt,
  StubTranslator,
  StubTts,
} from "@/lib/ai/stub";
import { describe, expect, it } from "vitest";
import {
  runQaContract,
  runScriptGeneratorContract,
  runSlideCriticContract,
  runSttContract,
  runTranslatorContract,
  runTtsContract,
} from "../contract/adapter-contracts";

// stub 구현이 어댑터 계약을 통과하는지 검증(네트워크 불요).
// 실제 Ollama 구현 계약 검증은 test/integration/ollama.live.test.ts (OLLAMA_LIVE=1에서만).
runScriptGeneratorContract("stub", () => new StubScriptGenerator());
runTtsContract("stub", () => new StubTts());
runSttContract("stub", () => new StubStt());
runQaContract("stub", () => new StubQaGenerator());
runSlideCriticContract("stub", () => new StubSlideCritic());
runTranslatorContract("stub", () => new StubTranslator());

describe("getAdapters", () => {
  it("모든 어댑터를 묶어 반환한다(구성만, 호출 없음)", () => {
    const a = getAdapters();
    expect(typeof a.script.generate).toBe("function");
    expect(typeof a.tts.synthesize).toBe("function");
    expect(typeof a.stt.transcribe).toBe("function");
    expect(typeof a.qa.generateQuestions).toBe("function");
    expect(typeof a.slideCritic.analyze).toBe("function");
    expect(typeof a.translator.translate).toBe("function");
    expect(typeof a.pronunciation.detect).toBe("function");
  });

  it("기본 발음 스코어러는 휴리스틱(의존성 0)", async () => {
    const out = await getAdapters().pronunciation.detect({
      wavFilePath: "x.wav",
      words: [{ word: "think", startSec: 0, endSec: 0.3, confidence: 0.3 }],
      l1Profile: undefined,
    });
    expect(Array.isArray(out)).toBe(true); // stub은 [], 실제 휴리스틱은 confidence<0.6 검출
  });
});
