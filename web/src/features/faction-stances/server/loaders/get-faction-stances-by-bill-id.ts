import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findFactionStancesByBillId } from "../repositories/faction-stance-repository";

export const getFactionStancesByBillId = unstable_cache(
  async (billId: string) => findFactionStancesByBillId(billId),
  ["faction-stances-by-bill-id"],
  { tags: [CACHE_TAGS.BILLS] }
);
