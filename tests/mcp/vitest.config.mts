import path from "node:path";
import { defineConfig } from "vitest/config";

const testsDir = path.resolve(__dirname);
const repoRoot = path.resolve(testsDir, "../..");

export default defineConfig({
  test: {
    globals: true,
    root: testsDir,
    include: ["**/*.test.ts"],
    pool: "forks",
    // vitest 4 で poolOptions.forks.singleFork は廃止。同等の設定（1プロセスで順に実行）
    maxWorkers: 1,
    isolate: false,
    setupFiles: [path.resolve(testsDir, "setup.ts")],
    globalSetup: [path.resolve(testsDir, "global-setup.ts")],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@mirai-gikai/supabase": path.resolve(repoRoot, "packages/supabase/src"),
      "@": path.resolve(repoRoot, "admin/src"),
      // ルート node_modules には zod / MCP SDK が無いため、
      // admin の node_modules（pnpm の symlink）経由で解決する。
      zod: path.resolve(repoRoot, "admin/node_modules/zod"),
      "@modelcontextprotocol/sdk": path.resolve(
        repoRoot,
        "admin/node_modules/@modelcontextprotocol/sdk"
      ),
    },
  },
});
