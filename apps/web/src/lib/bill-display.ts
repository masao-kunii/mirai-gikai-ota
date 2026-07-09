/**
 * 議案の表示用ラベル・色・整形。現行 web のバッジ定義と揃える。
 * enum 値は api（Drizzle）から string で来るため、未知値でも安全にフォールバックする。
 */

/** 議案一覧（GET /api/bills）の1件（カード表示に使う部分集合） */
export type BillListItem = {
  id: string;
  name: string;
  billNumber: string | null;
  proposalType: string;
  status: string;
  submittedDate: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isReviewCompleted: boolean;
  councilSessionId: string | null;
};

/** 会議（GET /api/council-sessions）の1件 */
export type CouncilSessionItem = {
  id: string;
  slug: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

/** 注目タグ（GET /api/tags）の1件 */
export type TagItem = {
  id: string;
  label: string;
  description: string | null;
  featuredPriority: number | null;
};

export const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  mayor_bill: "区長提出議案",
  committee_bill: "委員会提出議案",
  member_bill: "議員提出議案",
  report: "報告",
  petition: "請願・陳情",
  other: "その他",
};

export const PROPOSAL_TYPE_BADGE_CLASS: Record<string, string> = {
  mayor_bill: "bg-blue-50 text-blue-800 border-blue-200",
  committee_bill: "bg-indigo-50 text-indigo-800 border-indigo-200",
  member_bill: "bg-violet-50 text-violet-800 border-violet-200",
  report: "bg-slate-100 text-slate-700 border-slate-200",
  petition: "bg-amber-50 text-amber-800 border-amber-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

/** 提案タイプ別セクションの見出し（絵文字・説明・表示順）。現行 web と一致。 */
export const PROPOSAL_TYPE_EMOJI: Record<string, string> = {
  mayor_bill: "📝",
  committee_bill: "📋",
  member_bill: "🙋",
  report: "📣",
  petition: "📬",
  other: "🗂️",
};

export const PROPOSAL_TYPE_DESCRIPTION: Record<string, string> = {
  mayor_bill: "区長から議会に提出された議案",
  committee_bill: "委員会から議会に提出された議案",
  member_bill: "議員から議会に提出された議案",
  report: "区から議会への報告事項",
  petition: "区民から議会へ提出された請願・陳情",
  other: "議員派遣など、その他の議決事項",
};

export const PROPOSAL_TYPE_ORDER = [
  "mayor_bill",
  "committee_bill",
  "member_bill",
  "report",
  "petition",
  "other",
] as const;

/** カード用の簡略ステータスラベル（現行 getCardStatusLabel と同義） */
export function billStatusLabel(status: string): string {
  switch (status) {
    case "submitted":
    case "in_committee":
    case "plenary_session":
      return "議会審議中";
    case "approved":
      return "可決";
    case "adopted":
      return "採択";
    case "partially_adopted":
      return "一部採択";
    case "rejected":
      return "否決";
    default:
      return "議案提出前";
  }
}

export function billStatusBadgeClass(status: string): string {
  switch (status) {
    case "submitted":
    case "in_committee":
    case "plenary_session":
      return "bg-mirai-info-blue/30 text-mirai-text border-mirai-info-blue";
    case "approved":
    case "adopted":
    case "partially_adopted":
      return "bg-stance-for-bg text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-stance-against-bg text-stance-against border-rose-200";
    default:
      return "bg-mirai-surface-muted text-mirai-text-secondary border-mirai-border";
  }
}

// --- 会派見解（現行 faction-stances-section と一致） ---

export const STANCE_LABELS: Record<string, string> = {
  for: "賛成",
  conditional_for: "条件付き賛成",
  neutral: "中立",
  considering: "検討中",
  continued_deliberation: "継続審議",
  conditional_against: "条件付き反対",
  against: "反対",
};

export const STANCE_BADGE_CLASS: Record<string, string> = {
  for: "bg-emerald-100 text-emerald-800 border-emerald-200",
  conditional_for: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  considering: "bg-amber-50 text-amber-800 border-amber-200",
  continued_deliberation: "bg-amber-100 text-amber-800 border-amber-200",
  conditional_against: "bg-rose-50 text-rose-700 border-rose-200",
  against: "bg-rose-100 text-rose-800 border-rose-200",
};

// 表示順: 賛成 → 条件付き賛成 → 中立 → 検討中 → 継続審議 → 条件付き反対 → 反対
export const STANCE_ORDER: Record<string, number> = {
  for: 0,
  conditional_for: 1,
  neutral: 2,
  considering: 3,
  continued_deliberation: 4,
  conditional_against: 5,
  against: 6,
};

/** "2026-02-13" → "2026.02.13"。不正値は null。 */
export function formatDateDots(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/**
 * 会期の見出し・説明文（現行セッションページと同義）。
 * 例: 「2026年 令和8年第1回定例会の提出議案 12件」
 *     「2026.2月〜3月に実施された令和8年第1回定例会」（会期終了時）
 *     「2026.2月〜開催中の令和8年第1回定例会」（開催中）
 */
export function formatSessionHeading(
  session: CouncilSessionItem,
  billCount: number
): { title: string; description: string } {
  const start = session.startDate ? new Date(session.startDate) : null;
  const end = session.endDate ? new Date(session.endDate) : null;
  const startValid = start && !Number.isNaN(start.getTime()) ? start : null;
  const endValid = end && !Number.isNaN(end.getTime()) ? end : null;

  const year = startValid ? startValid.getFullYear() : "";
  const title = `${year ? `${year}年 ` : ""}${session.name}の提出議案 ${billCount}件`;

  let description = session.name;
  if (startValid) {
    const startPart = `${startValid.getFullYear()}.${startValid.getMonth() + 1}月`;
    const tail = endValid
      ? `〜${endValid.getMonth() + 1}月に実施された`
      : "〜開催中の";
    description = `${startPart}${tail}${session.name}`;
  }
  return { title, description };
}
