import { serve } from "@hono/node-server";
import { app } from "./app";

/**
 * ローカル開発用の Node サーバ。
 * 本番は Cloudflare Workers を第一候補とする（TARGET_ARCHITECTURE §1）。
 * app.fetch は fetch 標準なのでランタイム間で移植可能。
 */
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api: http://localhost:${info.port}/api`);
});
