import HomePage from "@/app/page";
import messages from "@/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("renders the home page heading", () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <HomePage />
      </NextIntlClientProvider>,
    );
    // 히어로 h1은 가치 헤드라인(브랜드명은 전역 헤더에 있음).
    expect(
      screen.getByRole("heading", { level: 1, name: messages.home.headline }),
    ).toBeInTheDocument();
  });
});
