import { Link } from "@tanstack/react-router";

/** 公開サイトのフッター（現行のグラデーション基調・TOP/規約/非公式注記） */
export function SiteFooter() {
  return (
    <footer className="bg-mirai-gradient">
      <div className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-6 px-6 py-14 text-center">
        <Link
          to="/"
          className="font-lexend font-extrabold text-base text-mirai-text"
        >
          TOP
        </Link>
        <nav className="flex items-center gap-4 font-bold text-mirai-text text-sm">
          <Link to="/terms" className="hover:text-primary-accent">
            利用規約
          </Link>
          <span className="text-mirai-border-muted">|</span>
          <Link to="/privacy" className="hover:text-primary-accent">
            プライバシーポリシー
          </Link>
        </nav>
        <p className="text-mirai-text-secondary text-xs leading-relaxed">
          本サイトはチームみらいが運営する公式サービスではなく、有志個人
          (masao-kunii) による非公式プロジェクトです。
          <br />
          本家「みらい議会」は{" "}
          <a
            href="https://gikai.team-mir.ai"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-primary-accent"
          >
            gikai.team-mir.ai
          </a>{" "}
          でご覧いただけます。
        </p>
      </div>
    </footer>
  );
}
