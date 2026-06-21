import { TrendChart } from "@/components/trend-chart";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("TrendChart", () => {
  it("값 개수만큼 점을 그린다", () => {
    const { container } = render(<TrendChart values={[120, 140, 135]} label="WPM" />);
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("단일 값도 중앙에 1개 점으로 처리", () => {
    const { container } = render(<TrendChart values={[130]} label="WPM" />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(1);
    expect(circles[0]?.getAttribute("cx")).toBe("50"); // W/2
  });

  it("band를 주면 음영 rect 렌더", () => {
    const { container } = render(<TrendChart values={[100, 160]} band={[110, 150]} label="WPM" />);
    expect(container.querySelector("rect")).toBeTruthy();
  });

  it("빈 값이면 아무것도 렌더하지 않음", () => {
    const { container } = render(<TrendChart values={[]} label="WPM" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("증감(delta) 표기: 첫→마지막", () => {
    const { container } = render(<TrendChart values={[120, 150]} label="WPM" />);
    expect(container.textContent).toContain("120 → 150");
    expect(container.textContent).toContain("(+30)");
  });
});
