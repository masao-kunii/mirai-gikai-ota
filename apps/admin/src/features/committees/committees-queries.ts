import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { adminCommitteesApi as committeesApi } from "../../lib/api";

type ListResponse = InferResponseType<typeof committeesApi.index.$get>;
export type AdminCommittee = ListResponse["committees"][number];

export type CreateCommitteeInput = InferRequestType<
  typeof committeesApi.index.$post
>["json"];
export type UpdateCommitteeInput = InferRequestType<
  (typeof committeesApi)[":id"]["$patch"]
>["json"];

const COMMITTEES_KEY = ["admin", "committees"] as const;

async function fetchCommittees(): Promise<AdminCommittee[]> {
  const res = await committeesApi.index.$get();
  if (!res.ok) throw new Error("委員会一覧の取得に失敗しました");
  const data = await res.json();
  return data.committees;
}

export function useCommittees() {
  return useQuery({ queryKey: COMMITTEES_KEY, queryFn: fetchCommittees });
}

export function useCreateCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommitteeInput) => {
      const res = await committeesApi.index.$post({ json: input });
      if (!res.ok) throw new Error("委員会の作成に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMITTEES_KEY }),
  });
}

export function useUpdateCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: UpdateCommitteeInput }) => {
      const res = await committeesApi[":id"].$patch({
        param: { id: vars.id },
        json: vars.input,
      });
      if (!res.ok) throw new Error("委員会の更新に失敗しました");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMITTEES_KEY }),
  });
}

export function useDeleteCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await committeesApi[":id"].$delete({ param: { id } });
      if (!res.ok) {
        // 議案が紐づいていると 409。誤って参照を失わないための保護。
        if (res.status === 409) {
          throw new Error("議案が紐づいているため削除できません");
        }
        throw new Error("委員会の削除に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMITTEES_KEY }),
  });
}
