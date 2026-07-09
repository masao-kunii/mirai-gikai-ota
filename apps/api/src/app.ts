import { Hono } from "hono";
import { billsRoute } from "./routes/bills";
import { createChatRoute } from "./routes/chat";
import { councilSessionsRoute } from "./routes/council-sessions";
import { tagsRoute } from "./routes/tags";

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
  .route("/tags", tagsRoute);
