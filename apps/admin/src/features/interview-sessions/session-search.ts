// 回答一覧の絞り込み・並べ替え条件。URL の検索パラメータに載せて共有・再読み込みできるようにする。
// 値の候補は api（routes/admin/interview-sessions.ts）の検証と一致させる。

export const STATUS_OPTIONS = [
  { value: "completed", label: "完了" },
  { value: "in_progress", label: "回答中" },
  { value: "archived", label: "アーカイブ" },
  { value: "all", label: "すべて" },
] as const;

export const REVIEW_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "承認待ち" },
  { value: "auto_approved", label: "自動承認" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "却下" },
  { value: "no_report", label: "レポートなし" },
] as const;

export const STANCE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "for", label: "賛成" },
  { value: "against", label: "反対" },
  { value: "neutral", label: "中立" },
] as const;

export const ROLE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "subject_expert", label: "専門的な有識者" },
  { value: "work_related", label: "業務に関係" },
  { value: "daily_life_affected", label: "暮らしに影響" },
  { value: "general_citizen", label: "一般的な関心" },
] as const;

export const MODERATION_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "ok", label: "問題なし" },
  { value: "warning", label: "注意" },
  { value: "ng", label: "要確認" },
  { value: "unscored", label: "未評価" },
] as const;

export const SORT_OPTIONS = [
  { value: "started_at", label: "開始日時" },
  { value: "message_count", label: "メッセージ数" },
  { value: "total_content_richness", label: "内容充実度" },
  { value: "moderation_score", label: "モデレーションスコア" },
] as const;

export const ORDER_OPTIONS = [
  { value: "desc", label: "降順" },
  { value: "asc", label: "昇順" },
] as const;

type ValueOf<T extends readonly { value: string }[]> = T[number]["value"];

export type SessionSearch = {
  configId?: string;
  status: ValueOf<typeof STATUS_OPTIONS>;
  review: ValueOf<typeof REVIEW_OPTIONS>;
  stance: ValueOf<typeof STANCE_OPTIONS>;
  role: ValueOf<typeof ROLE_OPTIONS>;
  moderation: ValueOf<typeof MODERATION_OPTIONS>;
  sort: ValueOf<typeof SORT_OPTIONS>;
  order: ValueOf<typeof ORDER_OPTIONS>;
  page: number;
};

export const DEFAULT_SESSION_SEARCH: SessionSearch = {
  status: "completed",
  review: "all",
  stance: "all",
  role: "all",
  moderation: "all",
  sort: "started_at",
  order: "desc",
  page: 1,
};

function pick<T extends readonly { value: string }[]>(
  options: T,
  raw: unknown,
  fallback: ValueOf<T>
): ValueOf<T> {
  const found = options.find((o) => o.value === raw);
  return found ? (found.value as ValueOf<T>) : fallback;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL の検索パラメータを検証する。知らない値は既定値に戻す（URL を手で直されても壊れない）。 */
export function parseSessionSearch(
  raw: Record<string, unknown>
): SessionSearch {
  const d = DEFAULT_SESSION_SEARCH;
  const page = Number(raw.page);
  return {
    configId:
      typeof raw.configId === "string" && UUID_RE.test(raw.configId)
        ? raw.configId
        : undefined,
    status: pick(STATUS_OPTIONS, raw.status, d.status),
    review: pick(REVIEW_OPTIONS, raw.review, d.review),
    stance: pick(STANCE_OPTIONS, raw.stance, d.stance),
    role: pick(ROLE_OPTIONS, raw.role, d.role),
    moderation: pick(MODERATION_OPTIONS, raw.moderation, d.moderation),
    sort: pick(SORT_OPTIONS, raw.sort, d.sort),
    order: pick(ORDER_OPTIONS, raw.order, d.order),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
