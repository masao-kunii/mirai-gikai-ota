import { formatDateWithDots } from "@/lib/utils/date";
import type { CouncilSession } from "../../shared/types";

type CurrentCouncilSessionProps = {
  session: CouncilSession | null;
  upcomingSession?: CouncilSession | null;
};

export function CurrentCouncilSession({
  session,
  upcomingSession,
}: CurrentCouncilSessionProps) {
  // 開催中の会期があれば優先表示。なければ次回開催予定を案内する。
  const isInSession = session != null;
  const showUpcoming = !isInSession && upcomingSession != null;

  return (
    <div className="w-full bg-mirai-surface-warm px-6 py-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-xl font-bold text-gray-800 leading-[0.9]">
            本日は
          </h2>
          <div
            className={`
            inline-flex items-center justify-center px-5 py-1.5 rounded-[50px]  shrink-0
            ${isInSession ? "bg-mirai-gradient" : "bg-mirai-border-muted"}
            `}
          >
            <span className="text-base font-bold leading-[1.48]">
              {isInSession ? "議会会期中" : "議会閉会中"}
            </span>
          </div>
        </div>
        {isInSession && (
          <div className="text-sm leading-[1.5] shrink-0">
            <div>{session.name}</div>
            <div>{formatDateWithDots(session.start_date)}〜</div>
          </div>
        )}
        {showUpcoming && (
          <div className="text-sm leading-[1.5] shrink-0 text-right">
            <div className="text-xs text-gray-500">次回会期</div>
            <div>{upcomingSession.name}</div>
            <div>{formatDateWithDots(upcomingSession.start_date)}〜</div>
          </div>
        )}
      </div>
    </div>
  );
}
