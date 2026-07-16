/**
 * 区政テーマ（政策領域）の表示用の型と、API 応答→表示型のマッパー。
 *
 * テーマの内容は DB（themes / theme_contents / theme_initiatives）で管理し、
 * apps/api の /api/themes 経由で取得する。ここは表示コンポーネントが使う
 * 契約（型）と、API 応答を表示型へ畳むマッパーだけを持つ。
 */
export type KuseiThemeDetail = {
  /** 区の方針・計画のやさしい要約（Markdown） */
  overview: string;
  /** 主な施策・取り組み */
  policies: { title: string; body: string }[];
  /** 最近の具体的な取り組み（住民が意見しやすい具体の事業） */
  recentActions?: {
    title: string;
    body: string;
    /** 開始時期など（例: 令和7年4月〜、実施中） */
    date?: string;
    /** 区の案内ページ */
    url?: string;
  }[];
  /** 数字（区の数字・オープンデータから接続予定） */
  numbers?: { label: string; value: string; note?: string }[];
  /** 関連する区の公式ページ（情報・サービス・注目ページ・計画）。1行説明つき。 */
  plans: { name: string; url: string; description?: string }[];
  /** 関連議案の紐付けに使う注目タグの label（既存タグに接続） */
  billTagLabel?: string;
};

export type KuseiTheme = {
  slug: string;
  emoji: string | null;
  name: string;
  lead: string | null;
  detail?: KuseiThemeDetail;
};

/** /api/themes/:slug の content 部分（jsonb は unknown で返る）。 */
type ThemeContentResponse = {
  overview: string | null;
  policies: unknown;
  numbers: unknown;
  plans: unknown;
  billTagLabel: string | null;
} | null;

/** /api/themes/:slug の initiatives 部分。 */
type ThemeInitiativeResponse = {
  title: string;
  body: string | null;
  dateLabel: string | null;
  url: string | null;
}[];

/**
 * API 応答（本文＋取り組み）を表示用の KuseiThemeDetail に畳む。
 * 本文が無い（＝準備中）テーマは undefined を返す。
 */
export function mapThemeDetail(
  content: ThemeContentResponse,
  initiatives: ThemeInitiativeResponse
): KuseiThemeDetail | undefined {
  if (!content) {
    return undefined;
  }
  return {
    overview: content.overview ?? "",
    policies: (content.policies as KuseiThemeDetail["policies"] | null) ?? [],
    recentActions: initiatives.map((i) => ({
      title: i.title,
      body: i.body ?? "",
      date: i.dateLabel ?? undefined,
      url: i.url ?? undefined,
    })),
    numbers: (content.numbers as KuseiThemeDetail["numbers"] | null) ?? [],
    plans: (content.plans as KuseiThemeDetail["plans"] | null) ?? [],
    billTagLabel: content.billTagLabel ?? undefined,
  };
}
