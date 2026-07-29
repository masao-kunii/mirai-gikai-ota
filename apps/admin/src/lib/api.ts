// ランタイムコードの import は禁止。api パッケージからは型のみ import する
// （TARGET_ARCHITECTURE §6「型のみの依存」）。管理フロントは apps/api の
// admin ルート型を使い、Hono RPC で型安全に叩く。
import type {
  AdminBillsRouteType,
  AdminCommitteesRouteType,
  AdminCouncilSessionsRouteType,
  AdminExpertsRouteType,
  AdminFactionsRouteType,
  AdminInterviewConfigsRouteType,
  AdminInterviewReportsRouteType,
  AdminMinutesRouteType,
  AdminReportFlagsRouteType,
  AdminTagsRouteType,
} from "api";
import { hc } from "hono/client";

/**
 * 管理 API の型付きクライアント（Hono RPC）。
 *
 * 管理フロントは純ブラウザ SPA なので相対 /api を使う。dev は Vite プロキシが
 * apps/api へ中継し、本番は Cloudflare の Routes で /api を api Worker へ振る。
 * 認証は Cloudflare Access がドメイン単位で担保する（フロントに認証コードなし）。
 */
export const adminTagsApi = hc<AdminTagsRouteType>("/api/admin/tags");
export const adminFactionsApi = hc<AdminFactionsRouteType>(
  "/api/admin/factions"
);
export const adminCommitteesApi = hc<AdminCommitteesRouteType>(
  "/api/admin/committees"
);
export const adminCouncilSessionsApi = hc<AdminCouncilSessionsRouteType>(
  "/api/admin/council-sessions"
);
export const adminBillsApi = hc<AdminBillsRouteType>("/api/admin/bills");
export const adminInterviewReportsApi = hc<AdminInterviewReportsRouteType>(
  "/api/admin/interview-reports"
);
export const adminInterviewConfigsApi = hc<AdminInterviewConfigsRouteType>(
  "/api/admin/interview-configs"
);
export const adminMinutesApi = hc<AdminMinutesRouteType>("/api/admin/minutes");
export const adminExpertsApi = hc<AdminExpertsRouteType>("/api/admin/experts");
export const adminReportFlagsApi = hc<AdminReportFlagsRouteType>(
  "/api/admin/report-flags"
);
