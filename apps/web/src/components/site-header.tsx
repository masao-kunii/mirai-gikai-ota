import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useDifficulty } from "../lib/difficulty";

/** 難易度トグル（説明をもっと詳しく＝normal↔hard）。ヘッダーとメニューで共用 */
function DifficultyToggle() {
  const { level, toggle } = useDifficulty();
  const detailed = level === "hard";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={detailed}
      className="flex items-center gap-2"
    >
      <span className="font-bold text-mirai-text text-sm">
        説明をもっと詳しく
      </span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          detailed ? "bg-primary" : "bg-mirai-surface-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            detailed ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const MENU_LINKS = [
  { to: "/", label: "トップ" },
  { to: "/archive", label: "アーカイブ" },
  { to: "/terms", label: "利用規約" },
  { to: "/privacy", label: "プライバシーポリシー" },
] as const;

/**
 * 公開サイトのヘッダー（白い角丸バー）。ロゴ＋「みらい議会」＋難易度トグル（sm+）
 * ＋メニュー（ナビ・ドロップダウン。モバイルは難易度トグルもメニュー内に格納）。
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="px-3 pt-3 lg:px-10">
      <div className="relative flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3 shadow-sm sm:px-6">
        {/* ロゴ + タイトル */}
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-primary text-center leading-none text-primary-foreground">
            <span className="font-bold text-[7px]">みらい議会</span>
            <span className="font-extrabold text-[11px] tracking-tight">
              ＠大田区
            </span>
            <span className="mt-0.5 text-[5px] opacity-90">
              unofficial fork
            </span>
          </span>
          <span className="font-bold text-mirai-text text-xl tracking-tight sm:text-2xl">
            みらい議会
          </span>
        </Link>

        {/* 右: 難易度トグル(sm+) + メニュー */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:block">
            <DifficultyToggle />
          </div>
          <button
            type="button"
            aria-label="メニュー"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-mirai-text transition-colors hover:bg-mirai-surface-grouped"
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* メニュードロップダウン */}
        {menuOpen && (
          <>
            {/* 外側クリックで閉じる透明オーバーレイ */}
            <button
              type="button"
              aria-label="メニューを閉じる"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <nav className="absolute top-full right-4 z-50 mt-2 flex w-56 flex-col overflow-hidden rounded-xl border border-mirai-border-light bg-card py-2 shadow-lg sm:right-6">
              {MENU_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 font-medium text-mirai-text text-sm transition-colors hover:bg-mirai-surface-grouped"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="https://github.com/masao-kunii/mirai-gikai-ota"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 font-medium text-mirai-text text-sm transition-colors hover:bg-mirai-surface-grouped"
              >
                GitHub
              </a>
              {/* モバイルでは難易度トグルをメニュー内に */}
              <div className="mt-1 border-mirai-border-light border-t px-4 pt-3 pb-1 sm:hidden">
                <DifficultyToggle />
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
