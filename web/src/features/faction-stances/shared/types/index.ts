import type { Database } from "@mirai-gikai/supabase";

export type StanceType = Database["public"]["Enums"]["stance_type_enum"];

export type FactionStanceWithFaction = {
  id: string;
  type: StanceType;
  comment: string | null;
  faction: {
    id: string;
    name: string;
    display_name: string;
    sort_order: number;
  };
};
