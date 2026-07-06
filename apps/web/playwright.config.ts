import { defineConfig, devices } from "@playwright/test";

/**
 * 新スタック（apps/web SSR + apps/api）の E2E スモーク。
 *
 * - ローカル: `pnpm --filter public-web test:e2e`
 *   E2E_BASE_URL 未指定なら http://localhost:3001。api(:8787) と web(:3001) を
 *   webServer で起動（既存があれば再利用）。要 Node 22（Vite 7）。
 * - デプロイ後スモーク: `E2E_BASE_URL=https://<preview> pnpm --filter public-web test:e2e`
 *   外部 URL 指定時は webServer を起動しない。
 *
 * チャットは UI の存在までを検証する。送信→POST のブラウザ結合は dev サーバーの
 * hydration が重く不安定なため含めず、apps/api の統合テストとデプロイ後スモークで担保する。
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const isExternalTarget = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // dev サーバー（vite / tsx watch）は並列負荷に弱いため直列実行する。
  // スモークなので実行時間より安定性を優先する。
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: isExternalTarget
    ? undefined
    : [
        {
          command: "pnpm --filter api dev",
          url: "http://localhost:8787/api/council-sessions",
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: "pnpm --filter public-web dev",
          url: "http://localhost:3001",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
