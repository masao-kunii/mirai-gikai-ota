import { createFileRoute, Link } from "@tanstack/react-router";
import { ArchiveSection } from "../components/archive-section";
import { Container } from "../components/container";
import { billsApi, councilSessionsApi } from "../lib/api";

export const Route = createFileRoute("/archive")({
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
  head: () => ({
    meta: [{ title: "過去の議案（アーカイブ） | みらい議会 大田区" }],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { bills, councilSessions } = Route.useLoaderData();

  // 最新会期（[0]）を除いた過去会期の議案を、会期ごとに束ねる。
  const archiveGroups = councilSessions
    .slice(1)
    .map((session) => ({
      session,
      bills: bills.filter((b) => b.councilSessionId === session.id),
    }))
    .filter((group) => group.bills.length > 0);

  return (
    <Container className="flex flex-col gap-8 py-12">
      <Link
        to="/"
        className="text-sm text-primary transition-colors hover:text-primary-accent"
      >
        ← トップへ戻る
      </Link>
      {archiveGroups.length > 0 ? (
        <ArchiveSection groups={archiveGroups} />
      ) : (
        <p className="rounded-xl border border-mirai-border-light bg-card p-6 text-mirai-text-secondary">
          過去の議案はまだありません。
        </p>
      )}
    </Container>
  );
}
