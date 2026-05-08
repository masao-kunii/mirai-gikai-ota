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
