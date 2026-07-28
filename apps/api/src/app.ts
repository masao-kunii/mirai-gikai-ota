import { Hono } from "hono";
import { requireAdminAccess } from "./lib/admin-auth";
import { adminBillsRoute } from "./routes/admin/bills";
import { adminCommitteesRoute } from "./routes/admin/committees";
import { adminCouncilSessionsRoute } from "./routes/admin/council-sessions";
import { adminExpertsRoute } from "./routes/admin/experts";
import { adminFactionsRoute } from "./routes/admin/factions";
import { adminInterviewConfigsRoute } from "./routes/admin/interview-configs";
import { adminInterviewReportsRoute } from "./routes/admin/interview-reports";
import { adminMinutesRoute } from "./routes/admin/minutes";
import { adminTagsRoute } from "./routes/admin/tags";
import { billsRoute } from "./routes/bills";
import { createChatRoute } from "./routes/chat";
import { councilSessionsRoute } from "./routes/council-sessions";
import { interviewsRoute } from "./routes/interviews";
import { tagsRoute } from "./routes/tags";
import { themesRoute } from "./routes/themes";

/**
 * 管理 API（apps/admin から呼ぶ）。
 *
 * /api/admin/* はまとめて requireAdminAccess（Cloudflare Access）配下に置き、
 * 認証境界をこの1か所で担保する。ハンドラは app_admin ロール（adminQuery）で
 * DB に触れる。公開ドメイン（下）とはロール・境界を分離する（§13/§158）。
 */
const adminApp = new Hono()
  .use("*", requireAdminAccess)
  .route("/bills", adminBillsRoute)
  .route("/tags", adminTagsRoute)
  .route("/factions", adminFactionsRoute)
  .route("/committees", adminCommitteesRoute)
  .route("/council-sessions", adminCouncilSessionsRoute)
  .route("/interview-reports", adminInterviewReportsRoute)
  .route("/interview-configs", adminInterviewConfigsRoute)
  .route("/minutes", adminMinutesRoute)
  .route("/experts", adminExpertsRoute);

/**
 * 公開 API（apps/api）の組み立て。
 *
 * - ルートはドメインごとに分割し、クライアントはドメイン別の型
 *   （routes/*.ts の *RouteType）を import する。
 *   単一の巨大 AppType は作らない（TARGET_ARCHITECTURE §6）。
 * - 公開ドメインのハンドラは publicQuery（public_reader）のみ使用する。
 */
export const app = new Hono()
  .basePath("/api")
  .route("/bills", billsRoute)
  .route("/chat", createChatRoute())
  .route("/council-sessions", councilSessionsRoute)
  .route("/tags", tagsRoute)
  .route("/themes", themesRoute)
  .route("/interviews", interviewsRoute)
  .route("/admin", adminApp);
