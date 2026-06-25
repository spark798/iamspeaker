import { ProgressView } from "@/components/progress-view";
import messages from "@/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const payload = {
  attempts: [
    {
      recordingId: "a",
      createdAt: 86_400_000,
      durationSec: 60,
      scriptVersion: 0,
      wpm: 100,
      fillerCount: 8,
    },
    {
      recordingId: "b",
      createdAt: 2 * 86_400_000,
      durationSec: 60,
      scriptVersion: 1,
      wpm: 140,
      fillerCount: 3,
    },
  ],
  summary: {
    analyzedCount: 2,
    wpm: { first: 100, latest: 140, deltaPct: 0.4, improved: true },
    fillerPerMin: { first: 8, latest: 3, deltaPct: 0.62, improved: true },
    bestFiller: { recordingId: "b", value: 3 },
    bestWpm: { recordingId: "b", value: 140 },
    goalMetCount: 1,
    latestMeetsGoal: true,
    streakDays: 2,
  },
  goal: { wpmMin: 130, wpmMax: 150, fillerPerMinMax: 5 },
};

afterEach(() => vi.restoreAllMocks());

describe("ProgressView — 동기부여 요약", () => {
  it("스트릭·개선·목표·베스트 테이크를 렌더", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => payload })) as unknown as typeof fetch,
    );
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <ProgressView sessionId="s1" />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText(messages.progress.summaryTitle)).toBeInTheDocument();
    // 스트릭 배지(2일 연속)
    expect(screen.getByText(/2일 연속/)).toBeInTheDocument();
    // 베스트 테이크 링크가 best 녹음 리포트로
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(links).toContain("/report?recording=b");
  });
});
