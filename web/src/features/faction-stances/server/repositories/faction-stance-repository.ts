import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { FactionStanceWithFaction } from "../../shared/types";

/**
 * 議案 ID に紐づく会派見解（faction_stances）を、会派情報とともに取得する。
 * 会派の sort_order 昇順 → display_name 昇順で返す。
 */
export async function findFactionStancesByBillId(
  billId: string
): Promise<FactionStanceWithFaction[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_stances")
    .select(
      `
      id,
      type,
      comment,
      faction:factions!inner (
        id,
        name,
        display_name,
        sort_order,
        is_active
      )
    `
    )
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`Failed to fetch faction stances: ${error.message}`);
  }
  if (!data) return [];

  return data
    .filter((row) => row.faction != null && row.faction.is_active)
    .map((row) => ({
      id: row.id,
      type: row.type,
      comment: row.comment,
      faction: {
        id: row.faction.id,
        name: row.faction.name,
        display_name: row.faction.display_name,
        sort_order: row.faction.sort_order,
      },
    }))
    .sort((a, b) => {
      if (a.faction.sort_order !== b.faction.sort_order) {
        return a.faction.sort_order - b.faction.sort_order;
      }
      return a.faction.display_name.localeCompare(b.faction.display_name);
    });
}
