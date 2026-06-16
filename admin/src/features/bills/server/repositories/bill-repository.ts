import "server-only";
import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  BillInsert,
  BillPublishStatus,
  BillSortConfig,
} from "../../shared/types";

type BillContentInsert =
  Database["public"]["Tables"]["bill_contents"]["Insert"];

export async function findBillsWithCouncilSessions(
  sortConfig?: BillSortConfig
) {
  const supabase = createAdminClient();
  const field = sortConfig?.field ?? "published_at";
  const ascending = (sortConfig?.order ?? "desc") === "asc";

  const orderOptions: { ascending: boolean; nullsFirst?: boolean } = {
    ascending,
  };

  if (field === "published_at") {
    orderOptions.nullsFirst = false;
  }

  const { data, error } = await supabase
    .from("bills")
    .select("*, council_sessions(name)")
    .order(field, orderOptions);

  if (error) {
    throw new Error(`Failed to fetch bills: ${error.message}`);
  }
  return data;
}

export async function findBillById(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", billId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill: ${error.message}`);
  }
  return data;
}

export async function createBill(insertData: BillInsert) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create bill: ${error.message}`);
  }
  return data;
}

export async function deleteBillById(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete bill: ${error.message}`);
  }
}

export async function updateBillPublishStatus(
  billId: string,
  publishStatus: BillPublishStatus
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bills")
    .update({ publish_status: publishStatus })
    .eq("id", billId);

  if (error) {
    throw new Error(`Failed to update bill publish status: ${error.message}`);
  }
}

export async function bulkUpdateBills(
  billIds: string[],
  patch: {
    publish_status?: BillPublishStatus;
    is_featured?: boolean;
    published_at?: string | null;
  }
): Promise<number> {
  if (billIds.length === 0) return 0;
  if (Object.keys(patch).length === 0) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .update(patch)
    .in("id", billIds)
    .select("id");
  if (error) {
    throw new Error(`Failed to bulk update bills: ${error.message}`);
  }
  return data?.length ?? 0;
}

export async function findBillContentsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select("*")
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill contents: ${error.message}`);
  }
  return data;
}

export async function createBillContents(contents: BillContentInsert[]) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bill_contents").insert(contents);

  if (error) {
    throw new Error(`Failed to create bill contents: ${error.message}`);
  }
}

export async function findPreviewToken(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("token, expires_at")
    .eq("bill_id", billId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function createPreviewToken(params: {
  billId: string;
  token: string;
  expiresAt: string;
  createdBy: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("preview_tokens").insert({
    bill_id: params.billId,
    token: params.token,
    expires_at: params.expiresAt,
    created_by: params.createdBy,
  });

  if (error) {
    throw new Error(`Failed to insert preview token: ${error.message}`);
  }
}

export async function deletePreviewTokenByBillId(billId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("preview_tokens")
    .delete()
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`Failed to delete preview token: ${error.message}`);
  }
}

export async function findPreviewTokenForValidation(
  billId: string,
  token: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("expires_at")
    .eq("bill_id", billId)
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}
