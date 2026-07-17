import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useRef } from "react";
import { CompactBillCard } from "../components/compact-bill-card";
import { Container } from "../components/container";
import { Markdown } from "../components/markdown";
import { OpinionEntryButton } from "../components/opinion-entry-button";
import { OpinionsSummarySection } from "../components/opinions-summary";
import { TextSelectionTooltip } from "../components/text-selection-tooltip";
import { themesApi } from "../lib/api";
import { MIN_PUBLIC_OPINIONS } from "../lib/bill-display";
import { type KuseiTheme, mapThemeDetail } from "../lib/kusei-themes";

export const Route = createFileRoute("/kusei/$theme")({
  loader: async ({ params }) => {
    // テーマ本体と、住民意見の集約を並行取得（集約は失敗しても本体は表示する）。
    const [res, opinionsRes] = await Promise.all([
      themesApi[":slug"].$get({ param: { slug: params.theme } }),
      themesApi[":slug"]["opinions-summary"].$get({
        param: { slug: params.theme },
      }),
    ]);
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
    const opinions = opinionsRes.ok ? await opinionsRes.json() : null;
    // 関連議案は API がテーマの bill_tag_label からサーバ側で解決して返す。
    return { theme, slug: params.theme, bills: data.relatedBills, opinions };
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
  const { theme, slug, bills, opinions } = Route.useLoaderData();
  const d = theme.detail;
  const hasOpinions = !!opinions && opinions.total >= MIN_PUBLIC_OPINIONS;
  // ページ内のテキスト選択で「AIに質問」ツールチップを出す（議案詳細と同じ）。
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Container ref={containerRef} className="flex flex-col gap-8 py-8">
      <TextSelectionTooltip containerRef={containerRef} />
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
                  <OpinionEntryButton
                    subject={p.title}
                    target={{ type: "theme", slug }}
                  />
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
                      <OpinionEntryButton
                        subject={a.title}
                        target={{ type: "initiative", initiativeId: a.id }}
                      />
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

          {/* 住民の声（公開インタビューの集約。テーマ全体にも意見できる） */}
          {hasOpinions && opinions ? (
            <section className="flex flex-col gap-3">
              <OpinionsSummarySection
                summary={opinions}
                heading="🗣️ このテーマへの住民の声"
                showStance={false}
              />
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-mirai-border-light bg-mirai-surface-grouped p-6">
                <p className="text-sm leading-relaxed text-mirai-text-secondary">
                  あなたの声も聞かせてください。AI が対話形式でお話をうかがい、
                  匿名で集計に加えます。
                </p>
                <OpinionEntryButton
                  subject={theme.name}
                  target={{ type: "theme", slug }}
                  label={`${theme.name}について意見する`}
                  variant="solid"
                />
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-[22px] text-mirai-text">
                🗣️ このテーマへの住民の声
              </h2>
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-mirai-border-light bg-mirai-surface-grouped p-6">
                <p className="text-sm leading-relaxed text-mirai-text-secondary">
                  意見募集中：このテーマについて、AI が対話形式であなたのお話を
                  うかがいます。一定数の声が集まると、匿名の集計をここに表示します。
                  まずはあなたの声から聞かせてください。
                </p>
                <OpinionEntryButton
                  subject={theme.name}
                  target={{ type: "theme", slug }}
                  label={`${theme.name}について意見する`}
                  variant="solid"
                />
              </div>
            </section>
          )}

          {/* 関連する区の公式ページ（情報・サービス・計画。このページの出典でもある） */}
          <section className="flex flex-col gap-3 border-mirai-border-light border-t pt-6">
            <h2 className="font-bold text-[22px] text-mirai-text">
              🔗 関連する区の公式ページ
            </h2>
            <p className="text-sm leading-relaxed text-mirai-text-secondary">
              このページは大田区の公式サイトをもとにまとめています。くわしくは
              各ページをご覧ください。
            </p>
            <ul className="flex flex-col gap-2">
              {d.plans.map((plan) => (
                <li
                  key={plan.url}
                  className="rounded-xl border border-mirai-border-muted bg-card p-3"
                >
                  <a
                    href={plan.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-primary text-sm underline-offset-2 hover:underline"
                  >
                    {plan.name}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  {plan.description && (
                    <p className="mt-0.5 text-mirai-text-secondary text-xs leading-relaxed">
                      {plan.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Container>
  );
}
