import { config } from "@/lib/config";

/**
 * 인프로세스 고정창(fixed-window) 레이트리미터 (보안/신뢰성 Q2).
 * 셀프호스트 단일 프로세스 전제 — 외부 스토어 없이 메모리 카운터로 폭주/남용을 막는다.
 * (멀티 워커/수평 확장 시에는 Redis 등 공유 스토어로 교체 — Q3.)
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** 창이 리셋될 때까지 남은 초(차단 시 Retry-After). */
  retryAfterSec: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitResult {
    const t = this.now();
    const entry = this.hits.get(key);
    if (!entry || t >= entry.resetAt) {
      const resetAt = t + this.windowMs;
      this.hits.set(key, { count: 1, resetAt });
      this.evictExpired(t);
      return { allowed: true, remaining: this.limit - 1, retryAfterSec: 0 };
    }
    if (entry.count >= this.limit) {
      return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((entry.resetAt - t) / 1000) };
    }
    entry.count++;
    return { allowed: true, remaining: this.limit - entry.count, retryAfterSec: 0 };
  }

  /** 만료된 키 정리(맵 무한 증가 방지). 호출 빈도가 낮아 단순 순회로 충분. */
  private evictExpired(t: number): void {
    if (this.hits.size < 1000) return;
    for (const [k, v] of this.hits) {
      if (t >= v.resetAt) this.hits.delete(k);
    }
  }
}

/** 요청에서 클라이언트 IP 추정(프록시 헤더 우선). 미상이면 공유 버킷("unknown"). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

const sharedLimiter = new RateLimiter(config.RATE_LIMIT_MAX, config.RATE_LIMIT_WINDOW_SEC * 1000);

/**
 * 라우트 가드: 한도 초과 시 429 Response(Retry-After 헤더 포함)를 반환, 통과 시 null.
 * bucket으로 라우트별 독립 한도를 둔다(한 엔드포인트 폭주가 다른 곳을 굶기지 않게).
 */
export function rateLimitGuard(req: Request, bucket: string): Response | null {
  if (!config.RATE_LIMIT_ENABLED) return null;
  const { allowed, retryAfterSec } = sharedLimiter.check(`${bucket}:${clientIp(req)}`);
  if (allowed) return null;
  return Response.json(
    {
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      },
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
