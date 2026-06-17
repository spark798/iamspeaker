/**
 * 일관된 API 에러 처리.
 * 내부(5xx) 오류는 사용자에게 메시지를 노출하지 않는다(스택/원인은 로그로만).
 * 프레임워크 비의존(순수) — 라우트 핸들러가 `toApiError`로 응답 형태를 만든다.
 */

/** API 응답 바디의 표준 에러 형태. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

/** 도메인/요청 처리 중 발생하는 의도된 오류. */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  /** 사용자에게 message를 그대로 노출해도 되는지(5xx 내부 오류는 false). */
  readonly expose: boolean;

  constructor(code: string, message: string, status = 400, expose = true) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

/** 자주 쓰는 에러 생성기. */
export const Errors = {
  badRequest: (message: string, code = "BAD_REQUEST") => new AppError(code, message, 400),
  notFound: (message = "찾을 수 없습니다", code = "NOT_FOUND") => new AppError(code, message, 404),
  payloadTooLarge: (message: string, code = "PAYLOAD_TOO_LARGE") =>
    new AppError(code, message, 413),
  unsupportedMedia: (message: string, code = "UNSUPPORTED_MEDIA_TYPE") =>
    new AppError(code, message, 415),
  internal: (message = "내부 오류가 발생했습니다", code = "INTERNAL") =>
    new AppError(code, message, 500, false),
} as const;

const GENERIC_INTERNAL = "내부 오류가 발생했습니다";

/**
 * 임의의 에러를 표준 API 응답(status + body)으로 변환한다.
 * AppError가 아니거나 expose=false면 내부 메시지를 숨기고 일반 메시지로 대체한다.
 * (원본 에러는 호출부에서 로깅할 것)
 */
export function toApiError(err: unknown): { status: number; body: ApiErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.expose ? err.message : GENERIC_INTERNAL } },
    };
  }
  return { status: 500, body: { error: { code: "INTERNAL", message: GENERIC_INTERNAL } } };
}

/**
 * 라우트 catch 표준 처리: 5xx(또는 비-AppError)는 서버에 원본 에러를 로깅하고 표준 응답 반환.
 * (스택은 로그에만, 클라이언트에는 일반 메시지)
 */
export async function errorResponse(err: unknown): Promise<Response> {
  const { status, body } = toApiError(err);
  if (status >= 500) {
    const { logger } = await import("@/lib/logger");
    logger.error({ err }, "API 5xx");
  }
  return Response.json(body, { status });
}
