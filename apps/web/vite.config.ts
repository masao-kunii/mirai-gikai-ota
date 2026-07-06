import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // ブラウザからの /api を apps/api（:8787）へ中継する（dev のみ）。
    // 同一オリジン扱いになり、匿名クッキー（mg_anon）がそのまま流れる。
    // 本番は web/api を同一ドメインに載せ、Cloudflare の Routes で /api を
    // api Worker へ振る（ADR 0002）。
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // 公式の指定どおり react プラグインは start プラグインの後に置く。
    // nitro が SSR サーバーのビルドとデプロイ preset を担う。Cloudflare 向けは
    // `NITRO_PRESET=cloudflare_module vite build`（ADR 0002）。
    tanstackStart(),
    viteReact(),
    nitro(),
  ],
});
