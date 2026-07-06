import { defineNitroConfig } from "nitro/config";

/**
 * Nitro（TanStack Start の SSR ビルド）設定。
 * Cloudflare 向けビルドは `NITRO_PRESET=cloudflare_module vite build`。
 */
export default defineNitroConfig({
  cloudflare: {
    wrangler: {
      name: "mirai-gikai-web",
    },
  },
  // ブラウザからの /api を api Worker へ転送し、web と同一オリジンに保つ
  // （匿名クッキー mg_anon が一貫し、SPA 遷移・チャットが同一オリジンで動く）。
  // 転送先はビルド時に API_ORIGIN で注入（未指定はローカル dev の :8787）。
  routeRules: {
    "/api/**": {
      proxy: `${process.env.API_ORIGIN ?? "http://localhost:8787"}/api/**`,
    },
  },
});
