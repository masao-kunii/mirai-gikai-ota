import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

export type CouncilSessionMinuteRow = {
  id: string;
  council_session_id: string;
  meeting_date: string;
  day_number: number | null;
  title: string | null;
  source_pdf_url: string;
  markdown_text: string | null;
  extracted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CouncilSessionMinuteWithSession = CouncilSessionMinuteRow & {
  council_sessions: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

export async function listMinutes(): Promise<
  CouncilSessionMinuteWithSession[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_session_minutes")
    .select("*, council_sessions(id, name, slug)")
    .order("meeting_date", { ascending: false });
  if (error) {
    throw new Error(`Failed to list minutes: ${error.message}`);
  }
  return data ?? [];
}

export async function findMinuteById(
  id: string
): Promise<CouncilSessionMinuteWithSession | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_session_minutes")
    .select("*, council_sessions(id, name, slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to find minute ${id}: ${error.message}`);
  }
  return data ?? null;
}

export async function updateMinuteMarkdown(
  id: string,
  markdownText: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_session_minutes")
    .update({
      markdown_text: markdownText,
      extracted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to update minute ${id}: ${error.message}`);
  }
}

export type CreateMinuteInput = {
  council_session_id: string;
  meeting_date: string;
  day_number?: number | null;
  title?: string | null;
  source_pdf_url: string;
};

export async function createMinute(
  input: CreateMinuteInput
): Promise<CouncilSessionMinuteRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_session_minutes")
    .insert(input)
    .select("*")
    .single();
  if (error) {
    throw new Error(`Failed to create minute: ${error.message}`);
  }
  return data;
}

/** 指定 PDF URL 群のうち、既に登録済みのものを返す (重複検出用) */
export async function findExistingSourcePdfUrls(
  urls: string[]
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_session_minutes")
    .select("source_pdf_url")
    .in("source_pdf_url", urls);
  if (error) {
    throw new Error(`Failed to fetch existing PDF urls: ${error.message}`);
  }
  return new Set((data ?? []).map((r) => r.source_pdf_url));
}

export async function bulkCreateMinutes(
  inputs: CreateMinuteInput[]
): Promise<number> {
  if (inputs.length === 0) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_session_minutes")
    .insert(inputs)
    .select("id");
  if (error) {
    throw new Error(`Failed to bulk create minutes: ${error.message}`);
  }
  return data?.length ?? 0;
}

export async function deleteMinute(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_session_minutes")
    .delete()
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to delete minute ${id}: ${error.message}`);
  }
}
