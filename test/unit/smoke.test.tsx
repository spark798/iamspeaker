import HomePage from "@/app/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("renders the home page heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "iamspeaker" })).toBeInTheDocument();
  });
});
