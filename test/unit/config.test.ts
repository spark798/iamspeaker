import { deriveEngines, parseEnv } from "@/lib/config";
import { describe, expect, it } from "vitest";

describe("config.parseEnv", () => {
  it("빈 환경에서 기본값을 적용한다", () => {
    const c = parseEnv({});
    expect(c.PORT).toBe(3000);
    expect(c.DATA_DIR).toBe("./data");
    expect(c.OLLAMA_HOST).toBe("http://localhost:11434");
    expect(c.ALLOWED_UPLOAD_EXT).toEqual(["pptx", "pdf"]);
  });

  it('빈 문자열("KEY=")을 미설정으로 취급한다', () => {
    const c = parseEnv({ ANTHROPIC_API_KEY: "" });
    expect(c.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("숫자를 강제 변환하고 확장자 목록을 정규화한다", () => {
    const c = parseEnv({ MAX_UPLOAD_MB: "20", ALLOWED_UPLOAD_EXT: "pdf, PPTX ,key" });
    expect(c.MAX_UPLOAD_MB).toBe(20);
    expect(c.ALLOWED_UPLOAD_EXT).toEqual(["pdf", "pptx", "key"]);
  });

  it("잘못된 값이면 throw 한다 (fail-fast)", () => {
    expect(() => parseEnv({ PORT: "abc" })).toThrow(/환경변수/);
    expect(() => parseEnv({ OLLAMA_HOST: "not-a-url" })).toThrow();
  });
});

describe("config.deriveEngines", () => {
  it("기본은 전부 로컬 엔진", () => {
    const e = deriveEngines(parseEnv({}));
    expect(e).toEqual({ script: "ollama", tts: "piper", stt: "whispercpp" });
  });

  it("클라우드 키가 있으면 클라우드 엔진을 우선한다", () => {
    expect(deriveEngines(parseEnv({ ANTHROPIC_API_KEY: "x" })).script).toBe("claude");
    expect(deriveEngines(parseEnv({ OPENAI_API_KEY: "x" })).script).toBe("openai");
    expect(deriveEngines(parseEnv({ ELEVENLABS_API_KEY: "x" })).tts).toBe("elevenlabs");
    expect(deriveEngines(parseEnv({ AZURE_SPEECH_KEY: "x" })).stt).toBe("azure");
  });
});
