import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * 管理フロント（apps/admin）は SSR 不要の純 SPA（TARGET_ARCHITECTURE Phase 4）。
 * 公開サイト（apps/web）と違い TanStack Start / Nitro は使わず、Vite + React +
 * TanStack Router（ファイルベース）+ TanStack Query で組む。
 *
 * 本番は Cloudflare Access（Zero Trust + Google IdP）でドメイン全体を保護し、
 * 認証は API 側の requireAdminAccess で担保する。フロントはログイン UI を持たない。
 */
export default defineConfig({
  server: {
    port: 3021,
    // dev のみ: ブラウザの /api を apps/api へ中継する。ローカルは api を
    // ADMIN_AUTH_DEV_BYPASS=true で起動し、Access なしで疎通確認できる。
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    // router プラグインは react プラグインより前に置く（公式指定）。
    // routes/ からファイルベースで routeTree.gen.ts を生成する。
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
  ],
});
