import { alignSegmentsToSlides } from "@/lib/ai/ollama";
import type { SlideContent } from "@/lib/domain";
import { describe, expect, it } from "vitest";

const slides: SlideContent[] = [
  { index: 0, textContent: "A", notes: null },
  { index: 1, textContent: "B", notes: null },
  { index: 2, textContent: "C", notes: null },
];

describe("alignSegmentsToSlides", () => {
  it("정확히 N개면 그대로 정렬", () => {
    const out = alignSegmentsToSlides(slides, [
      { slideIndex: 0, text: "a" },
      { slideIndex: 1, text: "b" },
      { slideIndex: 2, text: "c" },
    ]);
    expect(out).toEqual([
      { slideIndex: 0, text: "a" },
      { slideIndex: 1, text: "b" },
      { slideIndex: 2, text: "c" },
    ]);
  });

  it("여분 세그먼트(인트로/결론)는 버리고 N개 유지", () => {
    const out = alignSegmentsToSlides(slides, [
      { slideIndex: 0, text: "intro" },
      { slideIndex: 1, text: "b" },
      { slideIndex: 2, text: "c" },
      { slideIndex: 3, text: "extra-conclusion" },
      { slideIndex: 4, text: "extra2" },
    ]);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.slideIndex)).toEqual([0, 1, 2]);
    expect(out[2]?.text).toBe("c");
  });

  it("순서가 뒤섞여도 slideIndex로 매칭", () => {
    const out = alignSegmentsToSlides(slides, [
      { slideIndex: 2, text: "c" },
      { slideIndex: 0, text: "a" },
      { slideIndex: 1, text: "b" },
    ]);
    expect(out.map((s) => s.text)).toEqual(["a", "b", "c"]);
  });

  it("누락 슬라이드는 위치 폴백, 그래도 없으면 빈 문자열", () => {
    const out = alignSegmentsToSlides(slides, [
      { slideIndex: 0, text: "a" },
      { slideIndex: 1, text: "b" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[2]?.slideIndex).toBe(2);
    expect(out[2]?.text).toBe(""); // index 2 없음 + 위치 2 없음 → ""
  });

  it("중복 slideIndex는 첫 세그먼트 사용", () => {
    const out = alignSegmentsToSlides(slides, [
      { slideIndex: 0, text: "first" },
      { slideIndex: 0, text: "second" },
      { slideIndex: 1, text: "b" },
      { slideIndex: 2, text: "c" },
    ]);
    expect(out[0]?.text).toBe("first");
  });
});
