import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findAllDietSessions } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import { jsonResult } from "../utils/json-result";

export function registerDietSessionsTools(server: McpServer): void {
  server.registerTool(
    "list_council_sessions",
    {
      title: "国会会期一覧を取得",
      description:
        "登録されているすべての国会会期を返す。議案作成時のcouncil_session_id指定に利用できる。",
      inputSchema: {},
    },
    async () => {
      const sessions = await findAllDietSessions();
      return jsonResult(sessions);
    }
  );
}
