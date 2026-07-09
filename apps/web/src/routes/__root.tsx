import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteChat } from "../components/site-chat";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import stylesUrl from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#d76262" },
      { title: "みらい議会 大田区" },
      {
        name: "description",
        content:
          "大田区議会の議案をわかりやすく。議案の要約・会派の見解・審議状況を届けます。",
      },
    ],
    links: [
      { rel: "stylesheet", href: stylesUrl },
      // フォント（現行と同じ Noto Sans JP + Lexend Giga）
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lexend+Giga:wght@400;500;700;800;900&family=Noto+Sans+JP:wght@400;500;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        {/* 2カラムの持続シェル: 左=Outlet（一覧/詳細が差し替わる）、
            右=常設 AI チャット。遷移で再マウントされずガチャつかない。 */}
        {/* 画面両端のマージン ~1cm（lg:px-10=40px）、メインとチャットの間 ~5mm
            （gap-5=20px）。固定チャットと余白列(aside)の幅を 440px で揃え、
            チャットの右余白(lg:right-10=40px)を px と一致させて整列させる。 */}
        <div className="flex w-full flex-1 flex-col gap-5 px-3 py-3 lg:flex-row lg:items-start lg:px-10">
          <main className="min-w-0 lg:flex-1">
            {/* Hero〜一覧〜フッターまでを1つの角丸カードにまとめる */}
            <div className="overflow-hidden rounded-3xl bg-background shadow-sm">
              <Outlet />
              <SiteFooter />
            </div>
          </main>
          <aside className="hidden shrink-0 lg:block lg:w-[440px]">
            <div className="lg:fixed lg:top-[20vh] lg:right-10 lg:h-[72vh] lg:w-[440px]">
              <SiteChat variant="sidebar" />
            </div>
          </aside>
        </div>
        {/* モバイル: 右下フローティング（コンポーネント内で lg:hidden） */}
        <SiteChat variant="floating" />
      </div>
    </RootDocument>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <Link to="/" className="text-primary hover:text-primary-accent">
        トップへ戻る
      </Link>
    </div>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
