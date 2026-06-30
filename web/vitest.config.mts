import { defineConfig } from "vitest/config";
import path from "path";
import { coverageExclude } from "./vitest.shared";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    globals: true,
    // e2e は Playwright が実行するため Vitest の対象から除外する
    exclude: ["**/*.integration.test.ts", "**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: coverageExclude,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
