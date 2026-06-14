import {
  getAdapters,
  getQaGenerator,
  getScriptGenerator,
  getSlideCritic,
  getStt,
  getTts,
} from "@/lib/ai/factory";
import {
  StubQaGenerator,
  StubScriptGenerator,
  StubSlideCritic,
  StubStt,
  StubTts,
} from "@/lib/ai/stub";
import { describe, expect, it } from "vitest";
import {
  runQaContract,
  runScriptGeneratorContract,
  runSlideCriticContract,
  runSttContract,
  runTtsContract,
} from "../contract/adapter-contracts";

// stub 구현이 어댑터 계약을 통과하는지 검증.
runScriptGeneratorContract("stub", () => new StubScriptGenerator());
runTtsContract("stub", () => new StubTts());
runSttContract("stub", () => new StubStt());
runQaContract("stub", () => new StubQaGenerator());
runSlideCriticContract("stub", () => new StubSlideCritic());

// 팩토리가 반환하는 구현도 계약을 통과해야 한다(현재 stub).
runScriptGeneratorContract("factory", getScriptGenerator);
runTtsContract("factory", getTts);
runSttContract("factory", getStt);
runQaContract("factory", getQaGenerator);
runSlideCriticContract("factory", getSlideCritic);

describe("getAdapters", () => {
  it("모든 어댑터를 묶어 반환한다", () => {
    const a = getAdapters();
    expect(typeof a.script.generate).toBe("function");
    expect(typeof a.tts.synthesize).toBe("function");
    expect(typeof a.stt.transcribe).toBe("function");
    expect(typeof a.qa.generateQuestions).toBe("function");
    expect(typeof a.slideCritic.analyze).toBe("function");
  });
});
