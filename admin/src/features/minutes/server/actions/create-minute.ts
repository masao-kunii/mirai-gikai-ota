"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createMinute as createMinuteRecord } from "../repositories/minutes-repository";

const createMinuteInputSchema = z.object({
  council_session_id: z.string().uuid(),
  meeting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で入力してください"),
  day_number: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  source_pdf_url: z.string().url(),
});

export type CreateMinuteInput = z.infer<typeof createMinuteInputSchema>;

export type CreateMinuteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createMinute(
  input: CreateMinuteInput
): Promise<CreateMinuteResult> {
  const parsed = createMinuteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("\n"),
    };
  }
  try {
    const created = await createMinuteRecord(parsed.data);
    revalidatePath("/minutes");
    return { ok: true, id: created.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
