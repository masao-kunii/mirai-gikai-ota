import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { findMinuteById } from "../repositories/minutes-repository";
import { ExtractMinuteButton } from "../../client/components/extract-minute-button";

type Props = { id: string };

export async function MinuteDetailPage({ id }: Props) {
  const minute = await findMinuteById(id);
  if (!minute) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div>
        <Link href="/minutes" className="text-sm text-primary underline">
          ← 一覧へ戻る
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          {minute.title ?? `${minute.meeting_date} の議事録`}
        </h1>
        <div className="text-sm text-muted-foreground">
          <span>{minute.council_sessions?.name}</span>
          {" / "}
          <span>{minute.meeting_date}</span>
          {minute.day_number ? <span> / 第{minute.day_number}日</span> : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Button asChild variant="outline" size="sm">
            <a href={minute.source_pdf_url} target="_blank" rel="noreferrer">
              元PDFを開く
            </a>
          </Button>
          <ExtractMinuteButton id={minute.id} />
          {minute.extracted_at && (
            <span className="text-muted-foreground">
              最終抽出: {new Date(minute.extracted_at).toLocaleString("ja-JP")}
            </span>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-2">Markdown 抽出結果</h2>
        {minute.markdown_text ? (
          <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-xs leading-6 max-h-[70vh] overflow-y-auto">
            {minute.markdown_text}
          </pre>
        ) : (
          <p className="text-muted-foreground text-sm">
            まだ抽出されていません。「Markdown抽出」ボタンを押してください。
          </p>
        )}
      </section>
    </div>
  );
}
