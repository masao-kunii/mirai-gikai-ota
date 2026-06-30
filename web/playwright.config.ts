import { defineConfig, devices } from "@playwright/test";

/**
 * E2E スモークテスト設定。
 *
 * - ローカル: `pnpm --filter web test:e2e`
 *   `E2E_BASE_URL` 未指定なら http://127.0.0.1:3010 に対して実行。既存の dev サーバー
 *   があれば再利用し、無ければ dotenv 付きで起動する（Supabase はローカルを参照）。
 * - デプロイ後スモーク: `E2E_BASE_URL=https://ota.aix.tokyo pnpm --filter web test:e2e`
 *   外部 URL 指定時は webServer を起動せず、その URL に対して実行する。
 *
 * チャット（AI）の E2E は遅延・課金・レート制限があるため既定では skip し、
 * `E2E_CHAT=1` を指定したときだけ実行する（chat.spec.ts 参照）。
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3010";
const isExternalTarget = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // 外部 URL 指定時は自動起動しない。ローカル時のみ dev サーバーを起動/再利用する。
  webServer: isExternalTarget
    ? undefined
    : {
        command:
          "pnpm exec dotenv -e ../.env -- next dev --turbopack --port 3010",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
