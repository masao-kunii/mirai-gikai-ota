/**
 * インタビュー開始時に回答者が選ぶ「お立場」の選択肢（テーマ別）。
 *
 * 立場は AI に推測させず本人に選んでもらう方針。テーマごとに実態に合う
 * 選択肢を用意し、未定義のテーマは汎用セットを使う。選んだラベルはそのまま
 * 保存・集計され、テーマページの「回答者の立場」分布になる。
 */

const ROLE_OPTIONS_BY_THEME: Record<string, string[]> = {
  // 子育て・教育
  kosodate: [
    "子育て中",
    "子育て予定",
    "大田区在住の未成年",
    "子育てに関わる専門家",
    "その他子育てに関心のある区民",
  ],
};

/** テーマ固有の選択肢が無い場合の汎用セット。 */
const DEFAULT_ROLE_OPTIONS: string[] = [
  "この分野の当事者",
  "仕事・活動で関わっている",
  "関心のある区民",
];

/** テーマ slug に対応する立場の選択肢を返す（未定義は汎用）。 */
export function getRoleOptions(themeSlug?: string): string[] {
  return (
    (themeSlug && ROLE_OPTIONS_BY_THEME[themeSlug]) || DEFAULT_ROLE_OPTIONS
  );
}
