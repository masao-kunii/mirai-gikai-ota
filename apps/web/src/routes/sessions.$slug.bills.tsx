import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CompactBillCard } from "../components/compact-bill-card";
import { Container } from "../components/container";
import { billsApi, councilSessionsApi } from "../lib/api";
import { formatSessionHeading } from "../lib/bill-display";

export const Route = createFileRoute("/sessions/$slug/bills")({
  loader: async ({ params }) => {
    const [sessionRes, billsRes] = await Promise.all([
      councilSessionsApi[":slug"].$get({ param: { slug: params.slug } }),
      billsApi.index.$get({ query: { sessionSlug: params.slug } }),
    ]);
    if (sessionRes.status === 404) {
      throw notFound();
    }
    if (!sessionRes.ok || !billsRes.ok) {
      throw new Error("API の取得に失敗しました");
    }
    const [{ councilSession }, { bills }] = await Promise.all([
      sessionRes.json(),
      billsRes.json(),
    ]);
    return { councilSession, bills };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.councilSession.name}の提出議案 | みらい議会 大田区`
          : "みらい議会 大田区",
      },
    ],
  }),
  component: SessionBills,
});

function SessionBills() {
  const { councilSession, bills } = Route.useLoaderData();
  const { title, description } = formatSessionHeading(
    councilSession,
    bills.length
  );

  return (
    <div className="flex flex-col">
      {/* ヒーロー画像（Archive 共通） */}
      <div className="relative h-[200px] w-full overflow-hidden sm:h-[285px]">
        <img
          src="/img/archive-hero-7f3d06.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      <Container className="flex flex-col gap-8 py-8">
        {/* パンくず */}
        <nav
          aria-label="パンくず"
          className="flex items-center gap-1 text-sm text-mirai-text"
        >
          <Link
            to="/"
            className="text-primary transition-colors hover:text-primary-accent"
          >
            TOP
          </Link>
          <ChevronRight className="h-4 w-4 text-mirai-text-muted" />
          <span>過去の議案</span>
        </nav>

        <div className="flex flex-col gap-3">
          <img
            src="/icons/archive-typography.svg"
            alt="Archive"
            width={156}
            height={36}
            className="h-9 w-auto"
          />
          <h2 className="text-[22px] font-bold leading-snug text-mirai-text">
            {title}
          </h2>
          <p className="text-xs font-medium text-mirai-text">{description}</p>
        </div>

        <div className="flex flex-col gap-3">
          {bills.length > 0 ? (
            bills.map((bill) => <CompactBillCard key={bill.id} bill={bill} />)
          ) : (
            <p className="rounded-xl border border-mirai-border-light bg-card p-6 text-mirai-text-secondary">
              この会期の議案はまだありません。
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
