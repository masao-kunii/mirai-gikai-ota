import { app } from "./app";
import { setDbConnectionString } from "./lib/db";

/**
 * Cloudflare Workers 用エントリ（TARGET_ARCHITECTURE §1）。
 *
 * DB は Hyperdrive バインディング経由で接続する（Workers から Postgres への
 * 直 TCP を避け、接続プールと低レイテンシを得る）。connectionString を
 * getDb に橋渡しするだけで、ルート/ハンドラは Node 版と同一コードで動く。
 *
 * DB 以外の設定（ANON_COOKIE_SECRET / GEMINI_API_KEY / CHAT_* / NODE_ENV）は
 * nodejs_compat により wrangler の vars/secrets が process.env に供給されるため、
 * 追加の橋渡しは不要。
 */
interface Env {
  HYPERDRIVE?: { connectionString: string };
}

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Response | Promise<Response> {
    if (env.HYPERDRIVE?.connectionString) {
      setDbConnectionString(env.HYPERDRIVE.connectionString);
    }
    return app.fetch(request, env, ctx);
  },
};
