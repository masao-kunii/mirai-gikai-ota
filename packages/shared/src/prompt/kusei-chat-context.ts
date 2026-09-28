/**
 * 区政ページの AI チャットに渡す文脈（テーマの内容）を、プロンプトに埋め込む
 * 文章へ整える純粋関数。DB から読んだ値の形（JSON 列）をそのまま受け取る。
 */

export type KuseiThemeSummary = {
  name: string;
  lead: string | null;
};

export type KuseiThemeDetail = {
  name: string;
  lead: string | null;
  overview: string | null;
  /** theme_contents.policies（{title, body}[]） */
  policies: unknown;
  /** theme_contents.numbers（{label, value, note?}[]） */
  numbers: unknown;
  /** theme_contents.plans（{name, url, description?}[]） */
  plans: unknown;
  initiatives: { title: string; body: string | null; dateLabel: string | null }[];
};

/** テーマ一覧（/kusei）用。テーマ名と一行説明を並べる。 */
export function formatKuseiOverview(themes: KuseiThemeSummary[]): string {
  if (themes.length === 0) return "（現在公開中の区政テーマはありません）";
  return themes
    .map((t) => (t.lead ? `- ${t.name}: ${t.lead}` : `- ${t.name}`))
    .join("\n");
}

/** テーマ詳細（/kusei/:theme）用。概要・主な取り組み・数字・計画・最近の取り組み。 */
export function formatKuseiThemeDetail(theme: KuseiThemeDetail): string {
  const sections: string[] = [`## ${theme.name}`];
  if (theme.lead) sections.push(theme.lead);
  if (theme.overview) sections.push(`### 概要\n${theme.overview}`);

  const policies = records(theme.policies, ["title", "body"]);
  if (policies.length > 0) {
    sections.push(
      `### 主な取り組み\n${policies.map((p) => `- ${p.title}: ${p.body}`).join("\n")}`
    );
  }

  const numbers = records(theme.numbers, ["label", "value"]);
  if (numbers.length > 0) {
    sections.push(
      `### 数字で見る\n${numbers
        .map((n) => `- ${n.label}: ${n.value}${n.note ? `（${n.note}）` : ""}`)
        .join("\n")}`
    );
  }

  if (theme.initiatives.length > 0) {
    sections.push(
      `### 最近の具体的な取り組み\n${theme.initiatives
        .map(
          (i) =>
            `- ${i.title}${i.dateLabel ? `（${i.dateLabel}）` : ""}${i.body ? `: ${i.body}` : ""}`
        )
        .join("\n")}`
    );
  }

  const plans = records(theme.plans, ["name", "url"]);
  if (plans.length > 0) {
    sections.push(
      `### 関連する区の公式ページ\n${plans
        .map(
          (p) =>
            `- ${p.name}（${p.url}）${p.description ? `: ${p.description}` : ""}`
        )
        .join("\n")}`
    );
  }

  return sections.join("\n\n");
}

/**
 * JSON 列から、必須キーがすべて文字列の要素だけを取り出す（形が崩れた要素は捨てる）。
 * 任意キー（note / description など）は、文字列ならそのまま残す。
 */
function records(
  value: unknown,
  required: string[]
): Record<string, string | undefined>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (!required.every((k) => typeof entry[k] === "string" && entry[k] !== "")) {
      return [];
    }
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v === "string") out[k] = v;
    }
    return [out];
  });
}
