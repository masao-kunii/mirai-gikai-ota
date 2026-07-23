import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Building2, CalendarDays, FileText, Tags, Users } from "lucide-react";

// loader から queryClient を使えるよう context に型を通す。
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

// 管理ドメインは今後増える（bills / sessions / interviews …）。
// ここに1行足すだけでナビに載る構成にしておく。
const NAV_ITEMS = [
  { to: "/bills", label: "議案管理", icon: FileText },
  { to: "/tags", label: "タグ管理", icon: Tags },
  { to: "/factions", label: "会派管理", icon: Users },
  { to: "/committees", label: "委員会管理", icon: Building2 },
  { to: "/council-sessions", label: "議会会期管理", icon: CalendarDays },
] as const;

function RootLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-slate-200 border-b px-5 py-4">
          <p className="font-bold text-slate-900 text-sm">みらい議会＠大田区</p>
          <p className="text-slate-500 text-xs">管理コンソール</p>
        </div>
        <nav className="p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-slate-600 text-sm hover:bg-slate-100"
              activeProps={{ className: "bg-slate-100 text-slate-900" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
