import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import stylesUrl from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "みらい議会 大田区" },
      {
        name: "description",
        content:
          "大田区議会の議案をわかりやすく。議案の要約・会派の見解・審議状況を届けます。",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesUrl }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <header className="site-header">
        <div className="container">
          <Link to="/">みらい議会 大田区</Link>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </RootDocument>
  );
}

function NotFound() {
  return (
    <div>
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">トップへ戻る</Link>
      </p>
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
