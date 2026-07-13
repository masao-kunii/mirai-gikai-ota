import { defineNitroConfig } from "nitro/config";

/**
 * Nitro（TanStack Start の SSR ビルド）設定。
 * Cloudflare 向けビルドは `NITRO_PRESET=cloudflare_module vite build`。
 */
export default defineNitroConfig({
  cloudflare: {
    wrangler: {
      name: "mirai-gikai-web",
      // api Worker への Service Binding。
      // workers.dev の同一サブドメインでは Worker 間 HTTP（web→api）が
      // error 1042 でブロックされるため、HTTP プロキシではなく binding の
      // 内部呼び出し（env.API.fetch）で api を叩く。ローカルには binding が
      // 無いので、各呼び出し側で localhost:8787 への HTTP fallback を持つ。
      services: [{ binding: "API", service: "mirai-gikai-api" }],
      // 静的アセット配信は拡張子付きパス(/sitemap.xml)を Worker に渡さず 404 に
      // するため、/sitemap.xml だけは Worker を先に走らせて動的生成を返す。
      assets: {
        binding: "ASSETS",
        directory: "../public",
        run_worker_first: ["/sitemap.xml"],
      },
    },
  },
  // ブラウザからの /api/** を api Worker へ Service Binding 経由で中継し、
  // web と同一オリジンに保つ（匿名クッキー mg_anon が一貫する。ADR 0002 §2）。
  // 実体は server/api-proxy.ts。/sitemap.xml は公開議案/会期を動的列挙する。
  handlers: [
    { route: "/api/**", handler: "./server/api-proxy.ts" },
    { route: "/sitemap.xml", handler: "./server/sitemap.ts" },
  ],
});
