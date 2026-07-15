import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "../components/container";
import { KUSEI_THEMES } from "../lib/kusei-themes";

export const Route = createFileRoute("/kusei/")({
  head: () => ({
    meta: [
      { title: "区政をテーマで知る | みらい議会 大田区" },
      {
        name: "description",
        content:
          "大田区の計画・施策を、暮らしのテーマごとにわかりやすくまとめています。",
      },
    ],
  }),
  component: KuseiIndex,
});

function KuseiIndex() {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl text-mirai-text">
          区政をテーマで知る
        </h1>
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          大田区が「何を計画し、どう取り組んでいるか」を、暮らしのテーマごとに
          やさしくまとめています。議会で決まる議案と、区政の取り組みを行き来できます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {KUSEI_THEMES.map((theme) => (
          <Link
            key={theme.slug}
            to="/kusei/$theme"
            params={{ theme: theme.slug }}
            className="flex items-start gap-4 rounded-2xl border border-mirai-border-light bg-card p-5 transition-colors hover:bg-mirai-surface-grouped"
          >
            <span className="text-3xl leading-none">{theme.emoji}</span>
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-base text-mirai-text">
                {theme.name}
                {!theme.detail && (
                  <span className="ml-2 rounded-full bg-mirai-surface-muted px-2 py-0.5 text-[10px] font-medium text-mirai-text-muted">
                    準備中
                  </span>
                )}
              </h2>
              <p className="text-xs leading-relaxed text-mirai-text-secondary">
                {theme.lead}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
