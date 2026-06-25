import { isSmallLocalModel, parseModelSizeB } from "@/lib/ai/model-info";
import { describe, expect, it } from "vitest";

describe("parseModelSizeB", () => {
  it("콜론 뒤 크기를 파싱(버전 숫자 무시)", () => {
    expect(parseModelSizeB("llama3.1:8b")).toBe(8);
    expect(parseModelSizeB("hermes3:8b")).toBe(8);
    expect(parseModelSizeB("qwen2.5:14b")).toBe(14);
    expect(parseModelSizeB("llama3.1:70b")).toBe(70);
  });

  it("크기 토큰이 없으면 null", () => {
    expect(parseModelSizeB("phi3:mini")).toBeNull();
    expect(parseModelSizeB("llama3.1")).toBeNull();
    expect(parseModelSizeB("gpt-4o-mini")).toBeNull();
  });
});

describe("isSmallLocalModel", () => {
  it("로컬(ollama) + 임계 미만이면 true", () => {
    expect(isSmallLocalModel("ollama", "llama3.1:8b")).toBe(true);
    expect(isSmallLocalModel("ollama", "hermes3:8b")).toBe(true);
  });

  it("임계 이상이면 false", () => {
    expect(isSmallLocalModel("ollama", "qwen2.5:14b")).toBe(false);
    expect(isSmallLocalModel("ollama", "llama3.1:70b")).toBe(false);
  });

  it("클라우드 엔진은 항상 false", () => {
    expect(isSmallLocalModel("claude", "claude-sonnet-4-6")).toBe(false);
    expect(isSmallLocalModel("openai", "gpt-4o-mini")).toBe(false);
  });

  it("크기 미상 로컬 태그는 false(오경보 회피)", () => {
    expect(isSmallLocalModel("ollama", "phi3:mini")).toBe(false);
  });
});
