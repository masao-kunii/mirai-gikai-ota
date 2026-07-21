"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { unpublishFlaggedReport } from "../repositories/report-flags-repository";

export interface UnpublishResult {
  success: boolean;
  error?: string;
}

/** 通報を受けたレポートを非公開にする。 */
export async function unpublishReportAction(
  reportId: string
): Promise<UnpublishResult> {
  await requireAdmin();
  if (!reportId) {
    return { success: false, error: "レポートIDが必要です" };
  }
  try {
    await unpublishFlaggedReport(reportId);
    revalidatePath(routes.reportFlags());
    revalidateTag("public-interview-reports");
    return { success: true };
  } catch (error) {
    console.error("Error unpublishing report:", error);
    return { success: false, error: "非公開化に失敗しました" };
  }
}
