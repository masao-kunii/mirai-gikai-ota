import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { CompactBillCard } from "../components/compact-bill-card";
import { Container } from "../components/container";
import { Markdown } from "../components/markdown";
import { OpinionEntryButton } from "../components/opinion-entry-button";
import { billsApi, tagsApi, themesApi } from "../lib/api";
import type { BillListItem } from "../lib/bill-display";
import { type KuseiTheme, mapThemeDetail } from "../lib/kusei-themes";

export const Route = createFileRoute("/kusei/$theme")({
  loader: async ({ params }) => {
    const res = await themesApi[":slug"].$get({
      param: { slug: params.theme },
    });
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error("API の取得に失敗しました");
    }
    const data = await res.json();
    const theme: KuseiTheme = {
      ...data.theme,
      detail: mapThemeDetail(data.content, data.initiatives),
    };
    // 関連議案: テーマの billTagLabel → 注目タグ id → その議案（既存 api を再利用）
    let bills: BillListItem[] = [];
    const tagLabel = theme.detail?.billTagLabel;
    if (tagLabel) {
      const tagsRes = await tagsApi.index.$get();
      if (tagsRes.ok) {
        const tag = (await tagsRes.json()).tags.find(
          (t) => t.label === tagLabel
        );
        if (tag) {
          const billsRes = await billsApi.index.$get({
            query: { tagId: tag.id },
          });
          if (billsRes.ok) {
            bills = (await billsRes.json()).bills;
          }
        }
      }
    }
    return { theme, bills };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.theme.name} | 区政 | みらい議会 大田区`
          : "みらい議会 大田区",
      },
    ],
  }),
  component: KuseiThemeDetail,
});

function KuseiThemeDetail() {
  const { theme, bills } = Route.useLoaderData();
  const d = theme.detail;

  return (
    <Container className="flex flex-col gap-8 py-8">
      <Link
        to="/kusei"
        className="text-sm text-primary transition-colors hover:text-primary-accent"
      >
        ← 区政テーマ一覧へ
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-4xl leading-none">{theme.emoji}</span>
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl text-mirai-text">{theme.name}</h1>
          <p className="text-sm text-mirai-text-secondary">{theme.lead}</p>
        </div>
      </div>

      {!d ? (
        <p className="rounded-2xl border border-mirai-border-light bg-card p-6 text-mirai-text-secondary">
          このテーマの内容は準備中です。
        </p>
      ) : (
        <>
          {/* 区の方針・計画（やさしい要約） */}
          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-[22px] text-mirai-text">
              🏛️ 区の方針・計画
            </h2>
            <div className="rounded-2xl border border-mirai-border-light bg-card p-6">
              <Markdown className="text-mirai-text">{d.overview}</Markdown>
            </div>
          </section>

          {/* 主な取り組み（政策の柱。各取り組みに意見できる） */}
          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-[22px] text-mirai-text">
              主な取り組み
            </h2>
            <div className="flex flex-col gap-3">
              {d.policies.map((p) => (
                <div
                  key={p.title}
                  className="flex flex-col gap-2 rounded-xl border border-mirai-border-muted bg-card p-4"
                >
                  <h3 className="font-bold text-sm text-mirai-text">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-mirai-text-secondary">
                    {p.body}
                  </p>
                  <OpinionEntryButton subject={p.title} />
                </div>
              ))}
            </div>
          </section>

          {/* 最近の具体的な取り組み（実際の事業。ここにも意見できる） */}
          {d.recentActions && d.recentActions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-[22px] text-mirai-text">
                🆕 最近の具体的な取り組み
              </h2>
              <div className="flex flex-col gap-3">
                {d.recentActions.map((a) => (
                  <div
                    key={a.title}
                    className="flex flex-col gap-2 rounded-xl border border-mirai-border-muted bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-mirai-text">
                        {a.title}
                      </h3>
                      {a.date && (
                        <span className="rounded-full bg-mirai-surface-muted px-2 py-0.5 text-[10px] font-medium text-mirai-text-muted">
                          {a.date}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-mirai-text-secondary">
                      {a.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <OpinionEntryButton subject={a.title} />
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                        >
                          区の案内を見る
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 数字 */}
          {d.numbers && d.numbers.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-[22px] text-mirai-text">
                数字で見る
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {d.numbers.map((n) => (
                  <div
                    key={n.label}
                    className="flex flex-col gap-1 rounded-xl border border-mirai-border-muted bg-card p-4"
                  >
                    <span className="text-xs text-mirai-text-muted">
                      {n.label}
                    </span>
                    <span className="font-bold text-lg text-mirai-text">
                      {n.value}
                    </span>
                    {n.note && (
                      <span className="text-[11px] text-mirai-text-muted">
                        {n.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 関連する議案（議会側と接続） */}
          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-[22px] text-mirai-text">
              関連する議案
            </h2>
            {bills.length > 0 ? (
              <div className="flex flex-col gap-3">
                {bills.map((bill) => (
                  <CompactBillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-mirai-text-secondary">
                このテーマに紐づく議案はまだありません。
              </p>
            )}
          </section>

          {/* 住民の声（Phase A/B の集約がここに入る予定。テーマ全体にも意見できる） */}
          <section className="flex flex-col gap-3">
            <h2 className="font-bold text-[22px] text-mirai-text">
              🗣️ このテーマへの住民の声
            </h2>
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-mirai-border-light bg-mirai-surface-grouped p-6">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                準備中：このテーマについて集めた住民の意見（インタビューの集約）を
                ここに表示する予定です。まずはあなたの声から聞かせてください。
              </p>
              <OpinionEntryButton
                subject={theme.name}
                label={`${theme.name}について意見する`}
                variant="solid"
              />
            </div>
          </section>

          {/* 出典 */}
          <section className="flex flex-col gap-2 border-mirai-border-light border-t pt-4">
            <h3 className="font-bold text-sm text-mirai-text">
              出典（大田区の計画）
            </h3>
            <ul className="flex flex-col gap-1">
              {d.plans.map((plan) => (
                <li key={plan.url}>
                  <a
                    href={plan.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {plan.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Container>
  );
}
