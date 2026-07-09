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
          const active = i === current;
          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="relative flex h-5 w-full items-center justify-center">
                {i > 0 && (
                  <div className="-translate-y-1/2 absolute top-1/2 left-0 h-0.5 w-1/2 bg-primary" />
                )}
                {i < STAGES.length - 1 && (
                  <div className="-translate-y-1/2 absolute top-1/2 right-0 h-0.5 w-1/2 bg-primary" />
                )}
                <span
                  className={`relative z-10 rounded-full bg-primary ${
                    active ? "h-5 w-5" : "h-3 w-3"
                  }`}
                />
              </div>
              <span className="mt-2 whitespace-pre-line text-center text-xs font-medium leading-tight text-mirai-text">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
