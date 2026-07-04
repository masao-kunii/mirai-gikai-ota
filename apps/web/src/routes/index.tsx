import { createFileRoute, Link } from "@tanstack/react-router";
import { billsApi, councilSessionsApi } from "../lib/api";

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
  const sessionNameById = new Map(
    councilSessions.map((s) => [s.id, s.name] as const)
  );

  return (
    <div>
      <h1>議案一覧</h1>
      <p className="bill-meta">
        大田区議会の議案を、わかりやすい要約と会派の見解つきで届けます。
      </p>
      {bills.map((bill) => (
        <Link
          key={bill.id}
          className="bill-card"
          to="/bills/$id"
          params={{ id: bill.id }}
        >
          <div className="bill-meta">
            {sessionNameById.get(bill.councilSessionId ?? "") ?? ""}{" "}
            {bill.billNumber}
          </div>
          <div>{bill.name}</div>
        </Link>
      ))}
    </div>
  );
}
