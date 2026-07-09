// ランタイムコードの import は禁止（サーバコードがバンドルに混入する）。
// api パッケージからは型のみを import する（TARGET_ARCHITECTURE §6）。
import type {
  BillsRouteType,
  CouncilSessionsRouteType,
  TagsRouteType,
} from "api";
import { hc } from "hono/client";

/**
 * 公開 API の型付きクライアント（Hono RPC）。
 *
 * ローダーは isomorphic（初回 SSR はサーバー、SPA 遷移はブラウザ）で走るため、
 * 呼び出し経路を出し分ける:
 *   - サーバー（web Worker 内）: Service Binding（env.API）で api Worker を内部
 *     呼び出しする。workers.dev の Worker 間 HTTP は error 1042 でブロックされる
 *     ため HTTP は使わない。binding が無いローカルは API_URL_INTERNAL/localhost へ
 *     HTTP fallback。
 *   - ブラウザ: 相対 /api。web と同一オリジンで api にルーティングされ、匿名クッキー
 *     mg_anon も一貫する（server/api-proxy.ts が binding 経由で中継する）。
 */
interface ApiBinding {
  fetch: (request: Request) => Promise<Response>;
}

// Cloudflare Workers ランタイムでは各 fetch で globalThis.__env__ に env が入る
// （nitro cloudflare preset）。リクエストライフサイクル内でのみ有効。
function getApiBinding(): ApiBinding | undefined {
  return (globalThis as { __env__?: { API?: ApiBinding } }).__env__?.API;
}

// SSR 側の fetch。binding があれば内部呼び出し、無ければ HTTP（ローカル dev）。
const ssrFetch: typeof fetch = (input, init) => {
  const raw = typeof input === "string" ? input : input.toString();
  const url = new URL(raw);
  const path = `${url.pathname}${url.search}`;
  const api = getApiBinding();
  if (api) {
    // host は binding では無視されるのでダミーで可。path/method/body のみ意味を持つ。
    return api.fetch(new Request(`https://api.internal${path}`, init));
  }
  const base = process.env.API_URL_INTERNAL ?? "http://localhost:8787";
  return fetch(`${base}${path}`, init);
};

const isServer = import.meta.env.SSR;
// hc が URL を組み立てられるよう、SSR は絶対 URL のダミー、ブラウザは相対にする。
const API_BASE = isServer ? "https://api.internal" : "";
const clientOptions = isServer ? { fetch: ssrFetch } : undefined;

export const billsApi = hc<BillsRouteType>(
  `${API_BASE}/api/bills`,
  clientOptions
);
export const councilSessionsApi = hc<CouncilSessionsRouteType>(
  `${API_BASE}/api/council-sessions`,
  clientOptions
);
export const tagsApi = hc<TagsRouteType>(`${API_BASE}/api/tags`, clientOptions);
