import { hc } from "hono/client";
// ランタイムコードの import は禁止（サーバコードがバンドルに混入する）。
// api パッケージからは型のみを import する（TARGET_ARCHITECTURE §6）。
import type { BillsRouteType, CouncilSessionsRouteType } from "api";

/**
 * 公開 API の型付きクライアント（Hono RPC）。
 * SSR ローダーとブラウザの両方から同じ URL で呼ぶ。
 * 本番では VITE_API_URL を環境変数で注入する。
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export const billsApi = hc<BillsRouteType>(`${API_URL}/api/bills`);
export const councilSessionsApi = hc<CouncilSessionsRouteType>(
  `${API_URL}/api/council-sessions`
);
