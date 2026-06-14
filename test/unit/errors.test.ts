import { AppError, Errors, toApiError } from "@/lib/errors";
import { describe, expect, it } from "vitest";

describe("AppError", () => {
  it("필드를 보존한다", () => {
    const e = new AppError("X", "메시지", 418);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("X");
    expect(e.status).toBe(418);
    expect(e.expose).toBe(true);
  });
});

describe("toApiError", () => {
  it("AppError(4xx)는 코드·메시지를 노출한다", () => {
    const { status, body } = toApiError(Errors.badRequest("잘못된 입력", "BAD_INPUT"));
    expect(status).toBe(400);
    expect(body.error).toEqual({ code: "BAD_INPUT", message: "잘못된 입력" });
  });

  it("내부 오류(expose=false)는 메시지를 숨긴다", () => {
    const { status, body } = toApiError(Errors.internal("DB 커넥션 풀 고갈"));
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("DB");
  });

  it("일반 Error는 500으로 매핑하고 내부를 노출하지 않는다", () => {
    const { status, body } = toApiError(new Error("스택 누출 위험"));
    expect(status).toBe(500);
    expect(body.error.message).not.toContain("스택");
  });
});
