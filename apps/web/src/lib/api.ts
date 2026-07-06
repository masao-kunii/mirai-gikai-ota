import { hc } from "hono/client";
// ランタイムコードの import は禁止（サーバコードがバンドルに混入する）。
// api パッケージからは型のみを import する（TARGET_ARCHITECTURE §6）。
import type { BillsRouteType, CouncilSessionsRouteType } from "api";

/**
 * 公開 API の型付きクライアント（Hono RPC）。
 *
 * ローダーは isomorphic（初回 SSR はサーバー、SPA 遷移はブラウザ）で走るため、
 * ベース URL を出し分ける:
 *   - サーバー: 絶対 URL で apps/api を直接叩く（origin が無いので相対不可）
 *   - ブラウザ: 相対 `/api`。dev は vite proxy、本番は web/api 同一ドメインで
 *     apps/api にルーティングされ、同一オリジンなので匿名クッキーも一貫する
 *
 * サーバー側の宛先は API_URL_INTERNAL（本番の内部 URL）で上書きできる。
 */
const API_BASE = import.meta.env.SSR
  ? (process.env.API_URL_INTERNAL ?? "http://localhost:8787")
  : "";

export const billsApi = hc<BillsRouteType>(`${API_BASE}/api/bills`);
export const councilSessionsApi = hc<CouncilSessionsRouteType>(
  `${API_BASE}/api/council-sessions`
);
