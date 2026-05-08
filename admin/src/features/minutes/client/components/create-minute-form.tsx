"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMinute } from "../../server/actions/create-minute";

type Props = {
  councilSessions: { id: string; name: string }[];
};

export function CreateMinuteForm({ councilSessions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createMinute({
        council_session_id: String(formData.get("council_session_id") ?? ""),
        meeting_date: String(formData.get("meeting_date") ?? ""),
        title: (formData.get("title") as string) || null,
        day_number: (formData.get("day_number") as string)
          ? Number(formData.get("day_number"))
          : null,
        source_pdf_url: String(formData.get("source_pdf_url") ?? ""),
      });
      if (result.ok) {
        setMessage("議事録を追加しました");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-4"
    >
      <div className="md:col-span-2">
        <Label htmlFor="council_session_id">定例会</Label>
        <select
          id="council_session_id"
          name="council_session_id"
          required
          className="mt-1 block w-full rounded border px-3 py-2"
        >
          <option value="">選択してください</option>
          {councilSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="meeting_date">開催日（YYYY-MM-DD）</Label>
        <Input id="meeting_date" name="meeting_date" type="date" required />
      </div>
      <div>
        <Label htmlFor="day_number">第N日（任意）</Label>
        <Input
          id="day_number"
          name="day_number"
          type="number"
          min={1}
          placeholder="1"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="title">タイトル（任意）</Label>
        <Input
          id="title"
          name="title"
          placeholder="令和8年第1回定例会（第5日）"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="source_pdf_url">PDF URL</Label>
        <Input
          id="source_pdf_url"
          name="source_pdf_url"
          type="url"
          required
          placeholder="https://www.city.ota.tokyo.jp/.../080325.pdf"
        />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "追加中…" : "追加"}
        </Button>
        {error && (
          <p className="text-sm text-destructive whitespace-pre-line">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-green-700">{message}</p>}
      </div>
    </form>
  );
}
