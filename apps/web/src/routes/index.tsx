import { createFileRoute, Link } from "@tanstack/react-router";
import { CompactBillCard } from "../components/compact-bill-card";
import { Container } from "../components/container";
import { Hero } from "../components/hero";
import { ProposalTypeSection } from "../components/proposal-type-section";
import { SessionStatusBar } from "../components/session-status-bar";
import { billsApi, councilSessionsApi } from "../lib/api";
import { PROPOSAL_TYPE_ORDER } from "../lib/bill-display";

const ARCHIVE_PREVIEW_COUNT = 3;

export const Route = createFileRoute("/")({
  loader: async () => {
    const [billsRes, sessionsRes] = await Promise.all([
      billsApi.index.$get({ query: {} }),
      councilSessionsApi.index.$get(),
    ]);
    if (!billsRes.ok || !sessionsRes.ok) {
      throw new Error("API の取得に失敗しました");
    }
    const [{ bills }, { councilSessions }] = await Promise.all([
      billsRes.json(),
      sessionsRes.json(),
    ]);
    return { bills, councilSessions };
  },
  component: Home,
});

function Home() {
  const { bills, councilSessions } = Route.useLoaderData();

  // 会議は startDate 降順で返る（[0] が最新会期）。
  const latestSessionId = councilSessions[0]?.id ?? null;

  // 直近＝最新会期に属する議案（＋会期未設定）。それ以外は Archive へ。
  const mainBills = latestSessionId
    ? bills.filter(
        (b) =>
          b.councilSessionId === latestSessionId || b.councilSessionId == null
      )
    : bills;

  const billsByType = new Map<string, typeof mainBills>();
  for (const bill of mainBills) {
    const list = billsByType.get(bill.proposalType) ?? [];
    list.push(bill);
    billsByType.set(bill.proposalType, list);
  }

  // Archive（過去会期の議案）はトップではプレビュー数件のみ。全件は /archive。
  const archiveBills = latestSessionId
    ? bills.filter(
        (b) =>
          b.councilSessionId != null && b.councilSessionId !== latestSessionId
      )
    : [];
  const archivePreview = archiveBills.slice(0, ARCHIVE_PREVIEW_COUNT);

  return (
    <div className="flex flex-col">
      <Hero />
      <SessionStatusBar sessions={councilSessions} />

      <Container className="py-12">
        {mainBills.length > 0 ? (
          <div className="flex flex-col gap-14">
            <h2 className="font-lexend text-lg font-extrabold tracking-tight text-mirai-text">
              直近の議案一覧
            </h2>
            {PROPOSAL_TYPE_ORDER.map((type) => (
              <ProposalTypeSection
                key={type}
                proposalType={type}
                bills={billsByType.get(type) ?? []}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-mirai-border-light bg-card p-6 text-mirai-text-secondary">
            公開中の議案はまだありません。
          </p>
        )}
      </Container>

      {archiveBills.length > 0 && (
        <div className="bg-mirai-surface-muted py-12">
          <Container className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-lexend text-xl font-extrabold tracking-tight text-mirai-text">
                Archive
              </h2>
              <p className="text-xs font-medium text-mirai-text-secondary">
                過去の議会で議論された議案
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {archivePreview.map((bill) => (
                <CompactBillCard key={bill.id} bill={bill} />
              ))}
            </div>
            {archiveBills.length > ARCHIVE_PREVIEW_COUNT && (
              <Link
                to="/archive"
                className="self-center rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary-accent transition-colors hover:bg-white"
              >
                もっと読む
              </Link>
            )}
          </Container>
        </div>
      )}
    </div>
  );
}
