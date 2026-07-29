/**
 * フロントエンド（apps/web 等）へ公開する型のみのエントリポイント。
 *
 * ここから import してよいのは **型だけ**（`import type`）。
 * ランタイムコードを import するとサーバコードがクライアントバンドルに
 * 混入するため禁止する（TARGET_ARCHITECTURE §6「型のみの依存」）。
 */
export type { AdminBillsRouteType } from "./routes/admin/bills";
export type { AdminBillsMergeRouteType } from "./routes/admin/bills-merge";
export type { AdminCommitteesRouteType } from "./routes/admin/committees";
export type { AdminCouncilSessionsRouteType } from "./routes/admin/council-sessions";
export type { AdminExpertsRouteType } from "./routes/admin/experts";
export type { AdminFactionsRouteType } from "./routes/admin/factions";
export type { AdminInterviewConfigsRouteType } from "./routes/admin/interview-configs";
export type { AdminInterviewReportsRouteType } from "./routes/admin/interview-reports";
export type { AdminMinutesRouteType } from "./routes/admin/minutes";
export type { AdminReportFlagsRouteType } from "./routes/admin/report-flags";
export type { AdminTagsRouteType } from "./routes/admin/tags";
export type { BillsRouteType } from "./routes/bills";
export type { ChatRouteType } from "./routes/chat";
export type { CouncilSessionsRouteType } from "./routes/council-sessions";
export type { InterviewsRouteType } from "./routes/interviews";
export type { TagsRouteType } from "./routes/tags";
export type { ThemesRouteType } from "./routes/themes";
