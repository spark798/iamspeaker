import { hasVoiceForLang, piperVoiceModel } from "@/lib/ai/piper";
import { describe, expect, it } from "vitest";

describe("piperVoiceModel", () => {
  it("영어: voice로 female/male 매핑", () => {
    expect(piperVoiceModel("en", "female")).toBe("en_US-amy-medium");
    expect(piperVoiceModel("en", "male")).toBe("en_US-joe-medium");
    expect(piperVoiceModel()).toBe("en_US-amy-medium"); // lang 없으면 영어 기본
  });

  it("es/zh: 대상 언어 보이스", () => {
    expect(piperVoiceModel("es")).toBe("es_ES-davefx-medium");
    expect(piperVoiceModel("zh")).toBe("zh_CN-huayan-medium");
  });

  it("보이스 없는 언어(ko/ja)는 빈 문자열", () => {
    expect(piperVoiceModel("ko")).toBe("");
    expect(piperVoiceModel("ja")).toBe("");
  });
});

describe("hasVoiceForLang", () => {
  it("en/es/zh는 true, ko/ja는 false", () => {
    expect(["en", "es", "zh"].map(hasVoiceForLang)).toEqual([true, true, true]);
    expect(["ko", "ja"].map(hasVoiceForLang)).toEqual([false, false]);
  });
});
