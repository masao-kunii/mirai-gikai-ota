import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { adminInterviewSessionsApi as sessionsApi } from "../../lib/api";
import type { SessionSearch } from "./session-search";

type ListResponse = InferResponseType<typeof sessionsApi.index.$get, 200>;
export type AdminInterviewSessionRow = ListResponse["sessions"][number];

type StatsResponse = InferResponseType<typeof sessionsApi.stats.$get, 200>;
export type InterviewSessionStats = StatsResponse["stats"];

type DetailResponse = InferResponseType<
  (typeof sessionsApi)[":id"]["$get"],
  200
>;
export type AdminInterviewSessionDetail = DetailResponse;

// 承認・却下（interview-reports-queries）もこのキー配下を無効化する。
const SESSIONS_KEY = ["admin", "interview-sessions"] as const;

export function useInterviewSessions(search: SessionSearch) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, "list", search],
    queryFn: async () => {
      const { configId, page, ...rest } = search;
      const res = await sessionsApi.index.$get({
        query: {
          ...rest,
          page: String(page),
          ...(configId ? { configId } : {}),
        },
      });
      if (!res.ok) throw new Error("回答一覧の取得に失敗しました");
      return res.json();
    },
    // ページ送りや絞り込みの切り替え中も直前の結果を表示しておく。
    placeholderData: keepPreviousData,
  });
}

export function useInterviewSessionStats(configId: string | undefined) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, "stats", configId ?? "all"],
    queryFn: async (): Promise<InterviewSessionStats> => {
      const res = await sessionsApi.stats.$get({
        query: configId ? { configId } : {},
      });
      if (!res.ok) throw new Error("統計の取得に失敗しました");
      const data = await res.json();
      return data.stats;
    },
  });
}

export function useInterviewSession(id: string) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, "detail", id],
    queryFn: async (): Promise<AdminInterviewSessionDetail> => {
      const res = await sessionsApi[":id"].$get({ param: { id } });
      if (res.status === 404) throw new Error("回答が見つかりません");
      if (!res.ok) throw new Error("回答の取得に失敗しました");
      return res.json();
    },
  });
}
