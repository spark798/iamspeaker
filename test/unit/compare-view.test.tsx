import { CompareView } from "@/components/compare-view";
import messages from "@/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const takeA = {
  durationSec: 300,
  wpm: 100,
  fillerWords: [{ word: "um", count: 8 }],
  pronunciationScore: 70,
  scores: [{ metric: "wpm", value: 100, score: 60, band: "low" }],
  cues: [{ slideIndex: 1, kind: "pace_slow", value: 90 }], // A에만 → 개선됨
};
const takeB = {
  durationSec: 290,
  wpm: 135,
  fillerWords: [{ word: "um", count: 3 }],
  pronunciationScore: 84,
  scores: [{ metric: "wpm", value: 135, score: 95, band: "ideal" }],
  cues: [{ slideIndex: 4, kind: "filler", value: 3 }], // B에만 → 새 이슈
};

afterEach(() => vi.restoreAllMocks());

describe("CompareView", () => {
  it("두 회차 지표·점수를 나란히 + 델타로 렌더", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => (url.includes("/a-rec/") ? takeA : takeB),
      })) as unknown as typeof fetch,
    );
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <CompareView a="a-rec" b="b-rec" />
      </NextIntlClientProvider>,
    );
    // 발음 점수 두 회차 값
    expect(await screen.findByText("70")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    // 발음 개선 델타 +14 ▲ (개선=초록)
    expect(screen.getByText(/\+14/)).toBeInTheDocument();
    // 필러 감소(8→3)는 개선 델타 -5
    expect(screen.getByText(/-5/)).toBeInTheDocument();
    // 코칭 노트 변화: 슬라이드2 페이스 개선됨 + 슬라이드5 필러 새 이슈
    expect(screen.getByText(messages.compare.cueChangeTitle)).toBeInTheDocument();
    expect(screen.getByText(/슬라이드 2.*페이스.*개선됨/)).toBeInTheDocument();
    expect(screen.getByText(/슬라이드 5.*필러.*새 이슈/)).toBeInTheDocument();
  });
});
