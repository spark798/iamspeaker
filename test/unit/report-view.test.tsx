import { ReportView } from "@/components/report-view";
import messages from "@/messages/ko.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const analysis = {
  wpm: 130,
  fillerWords: [],
  slideTimeBreakdown: [],
  pronunciationIssues: [],
  scores: [],
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
});
