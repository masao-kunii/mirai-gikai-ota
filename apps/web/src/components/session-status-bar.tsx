import { type CouncilSessionItem, formatDateDots } from "../lib/bill-display";
import { Container } from "./container";

/** JST の今日（YYYY-MM-DD） */
function jstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
    new Date()
  );
}

/** 「本日は議会会期中／閉会中」バー（現行 CurrentCouncilSession 相当） */
export function SessionStatusBar({
  sessions,
}: {
  sessions: CouncilSessionItem[];
}) {
  const today = jstToday();
  // 会期の日程（開始〜終了）だけで「会期中」を判定する。is_active フラグには依存しない
  // （終了日を過ぎたら自動的に「閉会中」に切り替わり、次回会期があれば表示する）。
  const current = sessions.find(
    (s) =>
      s.startDate != null &&
      s.endDate != null &&
      s.startDate <= today &&
      today <= s.endDate
  );
  const upcoming = current
    ? undefined
    : sessions
        .filter((s) => s.startDate != null && s.startDate > today)
        .sort((a, b) =>
          (a.startDate ?? "") < (b.startDate ?? "") ? -1 : 1
        )[0];
  const isInSession = current != null;

  return (
    <div className="bg-mirai-surface-warm px-4 py-6 sm:px-6">
      <Container className="flex flex-wrap items-center gap-4 px-0 sm:px-0 lg:px-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-mirai-text">本日は</h2>
          <span
            className={`inline-flex items-center justify-center rounded-full px-5 py-1.5 text-base font-bold text-mirai-text ${
              isInSession ? "bg-mirai-gradient" : "bg-mirai-border-muted"
            }`}
          >
            {isInSession ? "議会会期中" : "議会閉会中"}
          </span>
        </div>
        {current && (
          <div className="text-sm text-mirai-text-secondary">
            <div>{current.name}</div>
            {current.startDate && (
              <div>{formatDateDots(current.startDate)}〜</div>
            )}
          </div>
        )}
        {upcoming && (
          <div className="text-sm text-mirai-text-secondary sm:ml-auto sm:text-right">
            <div className="text-xs text-mirai-text-muted">次回会期</div>
            <div>{upcoming.name}</div>
            {upcoming.startDate && (
              <div>{formatDateDots(upcoming.startDate)}〜</div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
