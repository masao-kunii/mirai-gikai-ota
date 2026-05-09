"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { bulkUpdateBills } from "../repositories/bill-repository";

const inputSchema = z.object({
  billIds: z.array(z.string().uuid()).min(1).max(500),
  publishStatus: z.enum(["draft", "published", "coming_soon"]).optional(),
  isFeatured: z.boolean().optional(),
  // public 化と同時に published_at を埋めるためのフラグ
  setPublishedAtNow: z.boolean().optional(),
});

export type BulkUpdateBillsInput = z.infer<typeof inputSchema>;

export type BulkUpdateBillsResult =
  | { ok: true; updatedCount: number }
  | { ok: false; error: string };

/**
 * 議案を一括更新する。publish_status / is_featured を一括変更でき、
 * 公開化と同時に published_at を today に揃える運用も可能。
 */
export async function bulkUpdateBillsAction(
  input: BulkUpdateBillsInput
): Promise<BulkUpdateBillsResult> {
  await requireAdmin();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("\n"),
    };
  }
  const { billIds, publishStatus, isFeatured, setPublishedAtNow } = parsed.data;

  const patch: {
    publish_status?: typeof publishStatus;
    is_featured?: boolean;
    published_at?: string | null;
  } = {};
  if (publishStatus !== undefined) patch.publish_status = publishStatus;
  if (isFeatured !== undefined) patch.is_featured = isFeatured;
  if (setPublishedAtNow) patch.published_at = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "更新する項目を指定してください" };
  }

  try {
    const updatedCount = await bulkUpdateBills(billIds, patch);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    revalidatePath("/bills");
    return { ok: true, updatedCount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
