"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ImportFromTeireiInput,
  importFromTeirei,
} from "../../server/actions/import-from-teirei";
import type { ImportTeireiResult } from "../../server/services/import-teirei-bills";

export type TeireiImportSession = {
  id: string;
  name: string;
  council_url: string | null;
};

type Props = {
  sessions: TeireiImportSession[];
};

/**
 * 大田区議会の定例会 index ページから議案・報告・請願陳情・会派見解を
 * 一括取り込みするフォーム。
 *
 * 会期を選ぶと、その会期の「議会公式URL」を index URL の初期値に流用する
 * （未設定なら手入力）。取り込みはデフォルト下書き（draft）。
 */
export function ImportFromTeireiForm({ sessions }: Props) {
  const sessionId = useId();
  const urlId = useId();
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? "");
  const [indexUrl, setIndexUrl] = useState(sessions[0]?.council_url ?? "");
  const [publish, setPublish] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportTeireiResult | null>(null);

  function handleSessionChange(id: string) {
    setSelectedId(id);
    const s = sessions.find((x) => x.id === id);
    setIndexUrl(s?.council_url ?? "");
  }

  function handleImport() {
    if (!selectedId || !indexUrl) return;
    setResult(null);
    const input: ImportFromTeireiInput = {
      councilSessionId: selectedId,
      indexUrl,
      publish,
    };
    startTransition(async () => {
      const r = await importFromTeirei(input);
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={sessionId}>取り込む定例会</Label>
        <select
          id={sessionId}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedId}
          onChange={(e) => handleSessionChange(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={urlId}>定例会 index ページ URL</Label>
        <Input
          id={urlId}
          type="url"
          value={indexUrl}
          onChange={(e) => setIndexUrl(e.target.value)}
          placeholder="https://www.city.ota.tokyo.jp/.../r_8/2teirei/index.html"
        />
        <span className="text-xs text-muted-foreground">
          区長提出議案・報告・請願陳情・会派見解のリンクを持つページを指定します。
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
        />
        取り込みと同時に公開する（チェックしない場合は下書きで取り込み）
      </label>

      <div>
        <Button
          onClick={handleImport}
          disabled={isPending || !selectedId || !indexUrl}
        >
          {isPending ? "取り込み中…" : "議案を一括取り込み"}
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-destructive bg-red-50 text-destructive"
          }`}
        >
          {result.ok ? (
            <p>
              議案 {result.billsUpserted} 件、会派見解 {result.stancesUpserted}{" "}
              件を取り込みました。
            </p>
          ) : (
            <p>取り込みに失敗しました: {result.error}</p>
          )}
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
