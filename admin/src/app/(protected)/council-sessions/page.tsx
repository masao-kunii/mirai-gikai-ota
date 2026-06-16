import { ImportFromTeireiForm } from "@/features/bills-import/client/components/import-from-teirei-form";
import { CouncilSessionForm } from "@/features/council-sessions/client/components/council-session-form";
import { CouncilSessionList } from "@/features/council-sessions/server/components/council-session-list";
import { loadCouncilSessions } from "@/features/council-sessions/server/loaders/load-council-sessions";

export default async function CouncilSessionsPage() {
  const sessions = await loadCouncilSessions();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">議会会期管理</h1>

      {/* 議案一括取り込みセクション */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-1">
          公式サイトから議案を一括取り込み
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          大田区議会の定例会ページから、区長提出議案・報告・請願陳情・会派見解を
          まとめて取り込みます。
        </p>
        <ImportFromTeireiForm
          sessions={sessions.map((s) => ({
            id: s.id,
            name: s.name,
            council_url: s.council_url,
          }))}
        />
      </section>

      {/* 議会会期追加セクション */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">議会会期を追加</h2>
        <CouncilSessionForm />
      </section>

      {/* 議会会期一覧セクション */}
      <section className="rounded-lg border bg-white p-6">
        <CouncilSessionList sessions={sessions} />
      </section>
    </div>
  );
}
