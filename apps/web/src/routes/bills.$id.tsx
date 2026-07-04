import { createFileRoute, notFound } from "@tanstack/react-router";
import { billsApi } from "../lib/api";

export const Route = createFileRoute("/bills/$id")({
  loader: async ({ params }) => {
    const res = await billsApi[":id"].$get({
      param: { id: params.id },
    });
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error("API の取得に失敗しました");
    }
    return res.json();
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

const STANCE_LABELS: Record<string, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審議",
};

function BillDetail() {
  const { bill, contents, stances } = Route.useLoaderData();
  const normal = contents.find((c) => c.difficultyLevel === "normal");

  return (
    <article>
      <p className="bill-meta">{bill.billNumber}</p>
      <h1>{normal?.title ?? bill.name}</h1>
      <p className="bill-meta">正式名称: {bill.name}</p>

      {normal ? (
        <>
          <h2>概要</h2>
          <p>{normal.summary}</p>
          <h2>内容</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{normal.content}</p>
        </>
      ) : (
        <p>この議案のわかりやすい解説は準備中です。</p>
      )}

      {stances.length > 0 && (
        <>
          <h2>会派の見解</h2>
          <table className="stance-table">
            <thead>
              <tr>
                <th>会派</th>
                <th>見解</th>
                <th>補足</th>
              </tr>
            </thead>
            <tbody>
              {stances.map((s) => (
                <tr key={s.factionName}>
                  <td>{s.factionName}</td>
                  <td>{STANCE_LABELS[s.type] ?? s.type}</td>
                  <td>{s.comment ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </article>
  );
}
