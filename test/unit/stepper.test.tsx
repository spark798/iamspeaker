import { Stepper } from "@/components/stepper";
import messages from "@/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

// usePathname을 /demo로 모킹 (vitest가 vi.mock을 import 위로 호이스팅).
vi.mock("next/navigation", () => ({ usePathname: () => "/demo" }));

function renderStepper() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <Stepper />
    </NextIntlClientProvider>,
  );
}

describe("Stepper", () => {
  it("현재 경로의 단계를 aria-current=step으로 표시", () => {
    renderStepper();
    const current = screen.getByText("AI 데모").closest("li");
    expect(current?.getAttribute("aria-current")).toBe("step");
  });

  it("모든 단계 라벨(i18n)을 렌더한다", () => {
    renderStepper();
    expect(screen.getByText("업로드")).toBeInTheDocument();
    expect(screen.getByText("Q&A")).toBeInTheDocument();
    expect(screen.getByText("기록")).toBeInTheDocument();
  });
});
