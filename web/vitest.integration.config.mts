import path from "node:path";
import { defineConfig } from "vitest/config";
import { coverageExclude } from "./vitest.shared";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: [path.resolve(__dirname, "vitest.integration.setup.ts")],
    // テスト間のデータ干渉を防ぐためシーケンシャル実行
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // システム全体のコスト上限（全ユーザーの当日/当月合計）は、統合テストが
    // apps/api と同一 Supabase DB で並列実行され、双方が per-user 上限検証のため
    // 巨額コストをシードすることで誤発火する（SYSTEM_DAILY_COST_LIMIT_REACHED）。
    // システム上限を assert するテストは無いため、ここで実質無制限まで上げて
    // per-user 上限（本来の検証対象）のみを効かせる。
    env: {
      CHAT_DAILY_TOTAL_COST_LIMIT_USD: "1000000000",
      CHAT_MONTHLY_TOTAL_COST_LIMIT_USD: "1000000000",
    },
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary"],
      reportsDirectory: "./coverage-integration",
      include: ["src/**/*.{ts,tsx}"],
      exclude: coverageExclude,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mirai-gikai/supabase": path.resolve(
        __dirname,
        "../packages/supabase/src"
      ),
      "@test-utils": path.resolve(__dirname, "../tests/supabase"),
    },
  },
});
