import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * 보안 헤더(상용 품질 하드닝). 마이크 녹음(MediaRecorder)·blob: 오디오를 쓰므로
 * Permissions-Policy에 microphone=(self), media-src에 blob:을 허용한다.
 * dev는 React Refresh가 eval을 쓰므로 'unsafe-eval'을 개발에서만 허용.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "font-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 네이티브 모듈은 서버 번들에 포함하지 않고 외부 의존으로 둔다.
  serverExternalPackages: ["better-sqlite3", "unpdf"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
