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
    expect(screen.getByRole("heading", { name: "iamspeaker" })).toBeInTheDocument();
  });
});
