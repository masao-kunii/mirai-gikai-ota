import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

/**
 * 公開サイトのヘッダー（現行の白い角丸バー基調）。
 * ロゴ（コーラルのアプリアイコン風）＋「みらい議会」＋右に難易度トグルとメニュー。
 * ※ トグル（説明をもっと詳しく）とメニューは現状ビジュアルのみ（機能は後続）。
 */
export function SiteHeader() {
  const [detailed, setDetailed] = useState(false);

  return (
    <header className="px-3 pt-3 lg:px-10">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3 shadow-sm sm:px-6">
        {/* ロゴ + タイトル */}
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-primary text-center leading-none text-primary-foreground">
            <span className="text-[7px] font-bold">みらい議会</span>
            <span className="text-[11px] font-extrabold tracking-tight">
              ＠大田区
            </span>
            <span className="mt-0.5 text-[5px] opacity-90">
              unofficial fork
            </span>
          </span>
          <span className="text-xl font-bold tracking-tight text-mirai-text sm:text-2xl">
            みらい議会
          </span>
        </Link>

        {/* 右: 難易度トグル + メニュー */}
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => setDetailed((v) => !v)}
            aria-pressed={detailed}
            className="hidden items-center gap-2 sm:flex"
          >
            <span className="text-sm font-bold text-mirai-text">
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

          <button
            type="button"
            aria-label="メニュー"
            className="rounded-lg p-1.5 text-mirai-text transition-colors hover:bg-mirai-surface-grouped"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
