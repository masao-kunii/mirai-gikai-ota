/** 審議の進捗ステージ（現行の BillStatusProgress 相当） */
const STAGES = ["議案\n上程", "委員会\n審査", "本会議\n採決", "可決\n/否決"];

/** 議案ステータス → 現在ステージの index（-1 は提出前） */
function currentStage(status: string): number {
  switch (status) {
    case "submitted":
      return 0;
    case "in_committee":
      return 1;
    case "plenary_session":
      return 2;
    case "approved":
    case "rejected":
    case "adopted":
    case "partially_adopted":
      return 3;
    default:
      return -1;
  }
}

export function StatusProgress({ status }: { status: string }) {
  const current = currentStage(status);

  return (
    <div className="rounded-2xl border border-mirai-border-light bg-card px-4 py-6 sm:px-8">
      <div className="flex items-start justify-between">
        {STAGES.map((label, i) => {
          // 到達済み（現在ステージ以前）だけ塗る。以降はグレーで“未到達”を示す。
          const reached = current >= 0 && i <= current;
          const isCurrent = i === current;
          // 連結線: 左半分=段 i へ到達で塗り、右半分=次段へ到達で塗り。
          const leftFilled = current >= 0 && i <= current;
          const rightFilled = current >= 0 && i < current;
          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="relative flex h-5 w-full items-center justify-center">
                {i > 0 && (
                  <div
                    className={`-translate-y-1/2 absolute top-1/2 left-0 h-0.5 w-1/2 ${
                      leftFilled ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                )}
                {i < STAGES.length - 1 && (
                  <div
                    className={`-translate-y-1/2 absolute top-1/2 right-0 h-0.5 w-1/2 ${
                      rightFilled ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 rounded-full ${
                    reached ? "bg-primary" : "bg-gray-300"
                  } ${isCurrent ? "h-5 w-5" : "h-3 w-3"}`}
                />
              </div>
              <span
                className={`mt-2 whitespace-pre-line text-center text-xs font-medium leading-tight ${
                  reached ? "text-mirai-text" : "text-gray-300"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
