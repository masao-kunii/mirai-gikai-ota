import "server-only";
import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getActiveCouncilSession } from "@/features/council-sessions/server/loaders/get-active-council-session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findPublishedBillsByProposalType } from "../repositories/bill-repository";
import type { BillWithContent, ProposalTypeEnum } from "../../shared/types";

/**
 * 議題種別ごとに公開済みの議題を取得する。
 * アクティブな議会会期があればその会期で絞り、なければ全件返す。
 */
export async function getBillsByProposalType(
  proposalType: ProposalTypeEnum
): Promise<BillWithContent[]> {
  const difficultyLevel = await getDifficultyLevel();
  const activeSession = await getActiveCouncilSession();
  return _getCached(proposalType, difficultyLevel, activeSession?.id ?? null);
}

const _getCached = unstable_cache(
  async (
    proposalType: ProposalTypeEnum,
    difficultyLevel: DifficultyLevelEnum,
    councilSessionId: string | null
  ): Promise<BillWithContent[]> => {
    const data = await findPublishedBillsByProposalType(
      proposalType,
      difficultyLevel,
      councilSessionId
    );
    if (!data || data.length === 0) return [];

    return data.map((row) => {
      const { bill_contents, ...bill } = row;
      const billContent = Array.isArray(bill_contents)
        ? bill_contents[0]
        : bill_contents;
      return {
        ...bill,
        bill_content: billContent ?? undefined,
        tags: [],
      };
    });
  },
  ["bills-by-proposal-type"],
  { tags: [CACHE_TAGS.BILLS] }
);
