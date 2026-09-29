import path from "node:path";
import { defineConfig } from "vitest/config";

const testsDir = path.resolve(__dirname);

export default defineConfig({
  test: {
    globals: true,
    root: testsDir,
    include: ["**/*.test.ts"],
    // テスト間のデータ干渉を防ぐためシーケンシャル実行
    pool: "forks",
    // vitest 4 で poolOptions.forks.singleFork は廃止。同等の設定（1プロセスで順に実行）
    maxWorkers: 1,
    isolate: false,
    globalSetup: [path.resolve(testsDir, "setup.ts")],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@mirai-gikai/supabase": path.resolve(
        __dirname,
        "../../packages/supabase/src"
      ),
      "server-only": path.resolve(__dirname, "server-only-stub.ts"),
    },
  },
});
