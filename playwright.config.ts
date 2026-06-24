import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI는 사전 build 후 프로덕션 서버로(안정적). 로컬은 dev로 빠른 반복.
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // E2E는 모델 없이 결정적으로 — 모든 AI 어댑터를 stub으로 강제. 병렬·재시도가
    // localhost 공유 버킷의 레이트리밋에 걸리지 않도록 E2E에서는 리밋 비활성.
    env: { USE_STUB_ADAPTERS: "1", RATE_LIMIT_ENABLED: "false" },
  },
});
