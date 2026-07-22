/**
 * フロントエンド（apps/web 等）へ公開する型のみのエントリポイント。
 *
 * ここから import してよいのは **型だけ**（`import type`）。
 * ランタイムコードを import するとサーバコードがクライアントバンドルに
 * 混入するため禁止する（TARGET_ARCHITECTURE §6「型のみの依存」）。
 */
export type { AdminCommitteesRouteType } from "./routes/admin/committees";
export type { AdminFactionsRouteType } from "./routes/admin/factions";
export type { AdminTagsRouteType } from "./routes/admin/tags";
export type { BillsRouteType } from "./routes/bills";
export type { ChatRouteType } from "./routes/chat";
export type { CouncilSessionsRouteType } from "./routes/council-sessions";
export type { InterviewsRouteType } from "./routes/interviews";
export type { TagsRouteType } from "./routes/tags";
export type { ThemesRouteType } from "./routes/themes";
