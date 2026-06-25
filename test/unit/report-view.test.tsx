import { ReportView } from "@/components/report-view";
import messages from "@/messages/ko.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const analysis = {
  sessionId: "s1",
  wpm: 130,
  fillerWords: [],
  slideTimeBreakdown: [],
  pronunciationIssues: [],
  pronunciationScore: 82,
  scores: [],
  cues: [{ slideIndex: 2, kind: "pace_fast", value: 200 }],
};

const analysisWithPhonemes = {
  ...analysis,
  pronunciationIssues: [
    {
      word: "think",
      expectedSound: "th 발음 주의",
      confidence: 0.4,
      l1Related: true,
      phonemes: [
        { ph: "θ", ok: false },
        { ph: "ɪ", ok: true },
        { ph: "ŋ", ok: true },
        { ph: "k", ok: true },
      ],
    },
  ],
};

function renderReport() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <ReportView recordingId="rec-1" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportView — PDF export", () => {
  it("내보내기 버튼이 window.print를 호출", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => analysis })) as unknown as typeof fetch,
    );
    const printSpy = vi.fn();
    vi.stubGlobal("print", printSpy);

    renderReport();
    const btn = await screen.findByRole("button", { name: messages.report.exportPdf });
    fireEvent.click(btn);
    expect(printSpy).toHaveBeenCalledOnce();
  });

  it("처방적 코칭 노트(슬라이드 앵커)를 렌더", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => analysis })) as unknown as typeof fetch,
    );
    renderReport();
    expect(await screen.findByText(messages.report.cueTitle)).toBeInTheDocument();
    // 슬라이드 3(=slideIndex 2 + 1) 페이스 cue 문구
    expect(screen.getByText(/슬라이드 3.*200 WPM/)).toBeInTheDocument();
  });

  it("'다시 연습' CTA가 세션 녹음 화면으로 (루프백)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => analysis })) as unknown as typeof fetch,
    );
    renderReport();
    const again = await screen.findByRole("link", { name: messages.common.practiceAgain });
    expect(again).toHaveAttribute("href", "/record?session=s1");
  });

  it("발음 점수(0-100)를 표시", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => analysis })) as unknown as typeof fetch,
    );
    renderReport();
    expect(await screen.findByText("82")).toBeInTheDocument();
  });

  it("음소별 색 분해(적/녹 칩)와 범례를 렌더", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => analysisWithPhonemes,
      })) as unknown as typeof fetch,
    );
    renderReport();
    // 음소 칩(IPA)이 개별 렌더되는지
    expect(await screen.findByText("θ")).toBeInTheDocument();
    expect(screen.getByText("ŋ")).toBeInTheDocument();
    // 범례
    expect(screen.getByText(messages.report.pronPhonemeLegend)).toBeInTheDocument();
  });
});
