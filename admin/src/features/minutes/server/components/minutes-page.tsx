import "server-only";

import Link from "next/link";
import { findAllCouncilSessions } from "@/features/council-sessions/server/repositories/council-session-repository";
import { Button } from "@/components/ui/button";
import { listMinutes } from "../repositories/minutes-repository";
import { CreateMinuteForm } from "../../client/components/create-minute-form";
import { ExtractAllMinutesButton } from "../../client/components/extract-all-minutes-button";
import { ImportFromSokuhouButton } from "../../client/components/import-from-sokuhou-button";

export async function MinutesPage() {
  const [minutes, councilSessions] = await Promise.all([
    listMinutes(),
    findAllCouncilSessions(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">議事録</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">
          速報版ページから一括取り込み
        </h2>
        <ImportFromSokuhouButton />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">一括 Markdown 抽出</h2>
        <ExtractAllMinutesButton />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">新規追加（手動）</h2>
        <CreateMinuteForm
          councilSessions={councilSessions.map((s) => ({
            id: s.id,
            name: s.name,
          }))}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          一覧（{minutes.length} 件）
        </h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">定例会</th>
                <th className="px-3 py-2 font-medium">日付</th>
                <th className="px-3 py-2 font-medium">タイトル</th>
                <th className="px-3 py-2 font-medium">PDF</th>
                <th className="px-3 py-2 font-medium">Markdown</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {minutes.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">
                    {m.council_sessions?.name ?? "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {m.meeting_date}
                    {m.day_number ? `（第${m.day_number}日）` : ""}
                  </td>
                  <td className="px-3 py-2">{m.title ?? "-"}</td>
                  <td className="px-3 py-2">
                    <a
                      href={m.source_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      原本
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    {m.markdown_text ? (
                      <span className="text-green-700">
                        {m.markdown_text.length.toLocaleString()} 字
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未抽出</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/minutes/${m.id}` as never}>詳細</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {minutes.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    議事録がまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
