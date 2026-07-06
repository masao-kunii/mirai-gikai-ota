import { defineNitroConfig } from "nitro/config";

/**
 * Nitro（TanStack Start の SSR ビルド）設定。
 * Cloudflare 向けビルドは `NITRO_PRESET=cloudflare_module vite build`。
 * worker 名を固定し、Nitro 生成の wrangler.json をデプロイに使う（ADR 0002）。
 */
export default defineNitroConfig({
  cloudflare: {
    wrangler: {
      name: "mirai-gikai-web",
    },
  },
});
