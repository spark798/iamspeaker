/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 네이티브 모듈은 서버 번들에 포함하지 않고 외부 의존으로 둔다.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
