"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { updateReviewDecision } from "../repositories/review-queue-repository";

export interface ReviewActionResult {
  success: boolean;
  error?: string;
}

/** 承認待ちレポートを承認して公開する（review_status=approved・公開）。 */
export async function approveReportAction(
  reportId: string
): Promise<ReviewActionResult> {
  await requireAdmin();
  if (!reportId) {
    return { success: false, error: "レポートIDが必要です" };
  }
  try {
    await updateReviewDecision(reportId, {
      reviewStatus: "approved",
      isPublicByAdmin: true,
    });
    revalidatePath(routes.reviewQueue());
    revalidateTag("public-interview-reports");
    return { success: true };
  } catch (error) {
    console.error("Error approving report:", error);
    return { success: false, error: "承認に失敗しました" };
  }
}

/** 承認待ちレポートを却下する（review_status=rejected・非公開）。 */
export async function rejectReportAction(
  reportId: string
): Promise<ReviewActionResult> {
  await requireAdmin();
  if (!reportId) {
    return { success: false, error: "レポートIDが必要です" };
  }
  try {
    await updateReviewDecision(reportId, {
      reviewStatus: "rejected",
      isPublicByAdmin: false,
    });
    revalidatePath(routes.reviewQueue());
    revalidateTag("public-interview-reports");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting report:", error);
    return { success: false, error: "却下に失敗しました" };
  }
}
