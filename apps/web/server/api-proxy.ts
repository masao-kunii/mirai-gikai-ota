import { defineHandler } from "nitro";

/**
 * ブラウザからの /api/** を apps/api（api Worker）へ中継するプロキシ。
 *
 * workers.dev の同一サブドメインでは Worker 間 HTTP（web→api）が error 1042 で
 * ブロックされる。そこで HTTP ではなく Service Binding（env.API）の内部呼び出しで
 * api を叩く。ブラウザからは相対 /api なので web と同一オリジンが保たれ、匿名クッキー
 * mg_anon がそのまま一巡する（ADR 0002 §2）。
 *
 * ローカル dev/preview には binding が無いので localhost:8787 へ HTTP fallback。
 */
interface ApiBinding {
  fetch: (request: Request) => Promise<Response>;
}

function getApiBinding(req: unknown): ApiBinding | undefined {
  // Cloudflare 実行時は nitro が req.runtime.cloudflare.env に env を載せる。
  // 併せて各 fetch で globalThis.__env__ にも env が入る（保険）。
  const fromReq = (
    req as { runtime?: { cloudflare?: { env?: { API?: ApiBinding } } } }
  )?.runtime?.cloudflare?.env?.API;
  const fromGlobal = (globalThis as { __env__?: { API?: ApiBinding } }).__env__
    ?.API;
  return fromReq ?? fromGlobal;
}

export default defineHandler((event) => {
  const req = event.req as Request;
  const api = getApiBinding(req);
  if (api) {
    // 生の Request をそのまま転送（method/headers/body/cookie を保持）。
    return api.fetch(req);
  }
  // ローカル dev/preview: binding が無いので HTTP fallback。
  const url = new URL(req.url);
  const target = `${process.env.API_ORIGIN ?? "http://localhost:8787"}${url.pathname}${url.search}`;
  return fetch(new Request(target, req));
});
