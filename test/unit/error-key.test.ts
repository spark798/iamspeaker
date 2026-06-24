import { errorKeyForStatus } from "@/lib/api/error-key";
import { describe, expect, it } from "vitest";

describe("errorKeyForStatus", () => {
  it("429 → tooManyRequests, 413 → tooLarge", () => {
    expect(errorKeyForStatus(429)).toBe("tooManyRequests");
    expect(errorKeyForStatus(413)).toBe("tooLarge");
  });

  it("매핑 없는 상태는 null(호출부 기본 키 사용)", () => {
    expect(errorKeyForStatus(400)).toBeNull();
    expect(errorKeyForStatus(500)).toBeNull();
    expect(errorKeyForStatus(404)).toBeNull();
  });
});
