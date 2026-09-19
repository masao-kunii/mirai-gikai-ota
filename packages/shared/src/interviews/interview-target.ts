/** インタビュー設定の対象（議案・区政テーマ・取り組みのいずれか1つ）。 */
export type InterviewTarget = {
  type: "bill" | "theme" | "initiative";
  name: string;
};

/** 設定と対象テーブルを外部結合した行のうち、対象の特定に使う列。 */
export type InterviewTargetColumns = {
  billId: string | null;
  billName: string | null;
  themeId: string | null;
  themeName: string | null;
  themeInitiativeId: string | null;
  initiativeTitle: string | null;
};

/**
 * インタビュー設定の対象を1つに決める。DB の check 制約で対象はちょうど1つ。
 * 対象の行が削除されて名前が取れないときも、種類は分かるので仮の名前を付ける。
 */
export function resolveInterviewTarget(
  row: InterviewTargetColumns
): InterviewTarget | null {
  if (row.billId) {
    return { type: "bill", name: row.billName ?? "(不明な議案)" };
  }
  if (row.themeId) {
    return { type: "theme", name: row.themeName ?? "(不明なテーマ)" };
  }
  if (row.themeInitiativeId) {
    return {
      type: "initiative",
      name: row.initiativeTitle ?? "(不明な取り組み)",
    };
  }
  return null;
}
