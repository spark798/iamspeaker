import { RateLimiter, clientIp } from "@/lib/ratelimit";
import { describe, expect, it } from "vitest";

describe("RateLimiter", () => {
  it("한도 내 요청은 허용하고 remaining을 감소시킨다", () => {
    const rl = new RateLimiter(3, 1000, () => 0);
    expect(rl.check("k")).toMatchObject({ allowed: true, remaining: 2 });
    expect(rl.check("k")).toMatchObject({ allowed: true, remaining: 1 });
    expect(rl.check("k")).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("한도 초과 시 차단하고 retryAfterSec를 알린다", () => {
    let now = 0;
    const rl = new RateLimiter(2, 5000, () => now);
    rl.check("k");
    rl.check("k");
    now = 1000; // 창 시작 후 1s 경과, 리셋까지 4s
    const r = rl.check("k");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBe(4);
  });

  it("창이 지나면 카운터가 리셋된다", () => {
    let now = 0;
    const rl = new RateLimiter(1, 1000, () => now);
    expect(rl.check("k").allowed).toBe(true);
    expect(rl.check("k").allowed).toBe(false);
    now = 1000; // 창 경계 도달
    expect(rl.check("k").allowed).toBe(true);
  });

  it("키(라우트·IP)별로 한도가 독립적이다", () => {
    const rl = new RateLimiter(1, 1000, () => 0);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x", { headers });

  it("x-forwarded-for의 첫 홉을 사용", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("x-real-ip 폴백", () => {
    expect(clientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("헤더 없으면 unknown(공유 버킷)", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
