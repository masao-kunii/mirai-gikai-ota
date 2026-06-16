import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";
import { findUpcomingCouncilSession } from "../repositories/council-session-repository";

/**
 * 指定日より後に開催される直近の議会会期を取得
 * 「次回会期: ◯月◯日〜」の表示などに使用
 */
export async function getUpcomingCouncilSession(
  date: Date
): Promise<CouncilSession | null> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const targetDate = `${year}-${month}-${day}`;

  return _getCachedUpcomingCouncilSession(targetDate);
}

const _getCachedUpcomingCouncilSession = unstable_cache(
  async (targetDate: string): Promise<CouncilSession | null> => {
    return findUpcomingCouncilSession(targetDate);
  },
  ["upcoming-council-session"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.DIET_SESSIONS],
  }
);
