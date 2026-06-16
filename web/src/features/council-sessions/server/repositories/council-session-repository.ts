import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { CouncilSession } from "../../shared/types";

/**
 * アクティブな議会会期を取得
 */
export async function findActiveCouncilSession(): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active diet session:", error);
    return null;
  }

  return data;
}

/**
 * 指定日時点で開催中の議会会期を取得
 */
export async function findCurrentCouncilSession(
  targetDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lte("start_date", targetDate)
    .gte("end_date", targetDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch current diet session:", error);
    return null;
  }

  return data;
}

/**
 * slugで議会会期を取得
 */
export async function findCouncilSessionBySlug(
  slug: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch diet session by slug:", error);
    return null;
  }

  return data;
}

/**
 * 指定日より前の直近の議会会期を取得
 */
export async function findPreviousCouncilSession(
  beforeStartDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lt("start_date", beforeStartDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch previous diet session:", error);
    return null;
  }

  return data;
}

/**
 * 指定日より後に開催が予定されている直近の議会会期を取得
 * 「次回会期」表示などに使用
 */
export async function findUpcomingCouncilSession(
  afterDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .gt("start_date", afterDate)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch upcoming council session:", error);
    return null;
  }

  return data;
}
