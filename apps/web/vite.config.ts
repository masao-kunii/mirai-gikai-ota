import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // ブラウザからの /api を apps/api（:8787）へ中継する。
    // 同一オリジン扱いになり、匿名クッキー（mg_anon）がそのまま流れる。
    // 本番は web と api を同一ドメインに載せる想定で、同じ相対 /api で動く。
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // 公式の指定どおり react プラグインは start プラグインの後に置く
    tanstackStart(),
    viteReact(),
  ],
});
