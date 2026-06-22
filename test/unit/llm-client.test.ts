import { extractJson } from "@/lib/ai/llm/client";
import { describe, expect, it } from "vitest";

describe("extractJson", () => {
  it("순수 JSON 객체", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("코드펜스(```json) 제거", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("앞뒤 산문이 있어도 첫 {…} 추출", () => {
    expect(
      extractJson('Here is the result:\n{"slides":[{"slideIndex":0,"text":"hi"}]}\nThanks!'),
    ).toEqual({ slides: [{ slideIndex: 0, text: "hi" }] });
  });

  it("배열도 처리", () => {
    expect(extractJson("prefix [1,2,3] suffix")).toEqual([1, 2, 3]);
  });

  it("JSON이 전혀 없으면 throw", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
