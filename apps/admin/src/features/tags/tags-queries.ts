import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminTagsApi } from "../../lib/api";

// RPC のレスポンス/リクエスト型から画面用の型を導出する（サーバーと構造を同期）。
type TagsListResponse = InferResponseType<typeof adminTagsApi.index.$get>;
export type AdminTag = TagsListResponse["tags"][number];

export type CreateTagInput = InferRequestType<
  typeof adminTagsApi.index.$post
>["json"];
export type UpdateTagInput = InferRequestType<
  (typeof adminTagsApi)[":id"]["$patch"]
>["json"];

const TAGS_KEY = ["admin", "tags"] as const;

async function fetchTags(): Promise<AdminTag[]> {
  const res = await adminTagsApi.index.$get();
  if (!res.ok) throw new Error("タグ一覧の取得に失敗しました");
  const data = await res.json();
  return data.tags;
}

export function useTags() {
  return useQuery({ queryKey: TAGS_KEY, queryFn: fetchTags });
}

// label 重複（409）はユーザーに分かる文言へ変換する。
function messageForStatus(status: number, fallback: string): string {
  if (status === 409) return "同じ名前のタグが既に存在します";
  return fallback;
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTagInput) => {
      const res = await adminTagsApi.index.$post({ json: input });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "タグの作成に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: UpdateTagInput }) => {
      const res = await adminTagsApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) {
        throw new Error(
          messageForStatus(res.status, "タグの更新に失敗しました")
        );
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await adminTagsApi[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("タグの削除に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}
