import { config } from "@/lib/config";
import pino from "pino";

/**
 * 앱 전역 구조화 로거(pino). 레벨은 `config.LOG_LEVEL`.
 * JSON 출력(가공 없음) — 개발 중 보기 좋게 하려면 `pnpm dev | pnpm exec pino-pretty`.
 * ⚠️ 서버 전용. 클라이언트 컴포넌트에서 import 금지.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { app: "iamspeaker" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** 로그 상관키 — 요청/작업/세션을 가로질러 추적. */
export interface LogContext {
  reqId?: string;
  jobId?: string;
  sessionId?: string;
}

/** 상관키를 바인딩한 child 로거를 만든다. */
export function withContext(ctx: LogContext): pino.Logger {
  return logger.child(ctx);
}
