import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { OctagonAlert } from "lucide-react";
import { useRef } from "react";
import { BillStatusBadge, ProposalTypeBadge } from "../components/bill-badges";
import { Container } from "../components/container";
import { FactionStances } from "../components/faction-stances";
import { Markdown } from "../components/markdown";
import { OpinionsSummarySection } from "../components/opinions-summary";
import {
  ReviewCompleteBadge,
  ReviewInProgressBanner,
} from "../components/review-status";
import { ShareButton } from "../components/share-button";
import { StatusProgress } from "../components/status-progress";
import { TextSelectionTooltip } from "../components/text-selection-tooltip";
import { billsApi } from "../lib/api";
import { MIN_PUBLIC_OPINIONS } from "../lib/bill-display";
import { useDifficulty } from "../lib/difficulty";

export const Route = createFileRoute("/bills/$id")({
  loader: async ({ params }) => {
    // 議案本体と、住民意見の集約を並行取得（集約は失敗しても本体は表示する）
    const [res, opinionsRes] = await Promise.all([
      billsApi[":id"].$get({ param: { id: params.id } }),
      billsApi[":id"]["opinions-summary"].$get({ param: { id: params.id } }),
    ]);
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error("API の取得に失敗しました");
    }
    const data = await res.json();
    const opinions = opinionsRes.ok ? await opinionsRes.json() : null;
    return { ...data, opinions };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.bill.name} | みらい議会 大田区`
      : "みらい議会 大田区";
    const normal = loaderData?.contents.find(
      (c) => c.difficultyLevel === "normal"
    );
    return {
      meta: [
        { title },
        ...(normal?.summary
          ? [{ name: "description", content: normal.summary.slice(0, 120) }]
          : []),
      ],
    };
  },
  component: BillDetail,
});

function BillDetail() {
  const { bill, contents, stances, opinions } = Route.useLoaderData();
  const { level } = useDifficulty();
  // ヘッダーの難易度トグルに応じた本文。無ければ normal にフォールバック。
  const content =
    contents.find((c) => c.difficultyLevel === level) ??
    contents.find((c) => c.difficultyLevel === "normal");
  const title = content?.title ?? bill.name;
  // 本文選択 →「AIに質問」ツールチップの対象範囲
  const articleRef = useRef<HTMLDivElement>(null);

  return (
    <Container ref={articleRef} className="flex flex-col gap-8 py-8">
      <TextSelectionTooltip containerRef={articleRef} />
      {/* 上部カード: タイトル → バッジ → 概要 → 正式名称 → 共有ボタン */}
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm sm:p-8">
        <Link
          to="/"
          className="text-sm text-primary transition-colors hover:text-primary-accent"
        >
          ← 議案一覧へ
        </Link>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold leading-snug text-mirai-text sm:text-3xl">
            {title}
            {bill.isReviewCompleted && <ReviewCompleteBadge />}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <ProposalTypeBadge type={bill.proposalType} />
            <BillStatusBadge
              status={bill.status}
              proposalType={bill.proposalType}
            />
          </div>
        </div>
        {content?.summary && (
          <p className="text-base leading-relaxed text-mirai-text sm:text-lg">
            {content.summary}
          </p>
        )}
        <p className="text-sm text-mirai-text-muted">{bill.name}</p>
        {!bill.isReviewCompleted && <ReviewInProgressBanner />}
        <ShareButton title={title} />
      </div>

      {/* 審議のステータス（報告は採決フローが無いため進捗バーを出さない） */}
      <section className="flex flex-col gap-4">
        <h2 className="font-bold text-[22px] text-mirai-text">
          👉 審議のステータス
        </h2>
        {bill.proposalType === "report" ? (
          <div className="rounded-2xl border border-mirai-border-light bg-card px-4 py-6 text-center sm:px-8">
            <p className="text-sm font-medium text-mirai-text">
              本会議で報告済み
            </p>
          </div>
        ) : (
          <StatusProgress status={bill.status} />
        )}
      </section>

      {/* 詳細 */}
      {content?.content ? (
        <section>
          <Markdown className="text-mirai-text">{content.content}</Markdown>
        </section>
      ) : (
        <p className="text-mirai-text-secondary">
          この議案のわかりやすい解説は準備中です。
        </p>
      )}

      {/* 会派の見解 */}
      <FactionStances stances={stances} />

      {/* 住民の意見（公開インタビューの集約）。少数だと非表示。 */}
      {opinions && opinions.total >= MIN_PUBLIC_OPINIONS && (
        <OpinionsSummarySection summary={opinions} />
      )}

      {/* 記事フッター: 共有・報告・免責 */}
      <div className="flex flex-col gap-3 pt-4">
        <ShareButton
          title={title}
          label="記事を共有する"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-mirai-border-muted bg-mirai-gradient px-6 py-4 text-base font-bold text-mirai-text transition-opacity hover:opacity-90"
        />
        <a
          href="https://github.com/masao-kunii/mirai-gikai-ota/issues/new"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-mirai-text bg-card px-6 py-4 text-base font-bold text-mirai-text transition-colors hover:bg-mirai-surface-grouped"
        >
          <OctagonAlert className="h-5 w-5" />
          問題を報告する
        </a>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-mirai-text">
            掲載コンテンツについて
          </h3>
          <p className="text-sm leading-relaxed text-mirai-text-secondary">
            掲載されている議案情報は、大田区議会に提出された議案などの公開情報を基に、AIを活用しながら背景情報を整理したものです。本サイトはチームみらいが運営する公式サービスではなく、有志個人
            (masao-kunii) による非公式プロジェクトです。
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-mirai-text">免責事項</h3>
          <p className="text-sm leading-relaxed text-mirai-text-secondary">
            本サイトで公開する情報は、可能な限り正確かつ最新の情報を反映するよう努めていますが、その正確性・完全性・即時性について保証するものではありません。また、AIチャットは不正確または誤解を招く回答を生成する可能性があります。正確な情報は、公式文書や一次資料をご確認ください。
          </p>
        </section>
      </div>
    </Container>
  );
}
