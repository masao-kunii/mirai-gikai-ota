/**
 * 大田区議会の定例会ページから抽出した構造化データの型定義。
 *
 * 公式サイト構造（令和8年第N回定例会）:
 *   index ページ → 区長提出議案 / 委員会提出議案 / 報告 / 請願・陳情 / 会派態度
 * の各サブページへのリンクを持つ。各サブページは HTML テーブル。
 *
 * これらの型は純粋パーサ（parse-teirei-pages.ts）の出力であり、
 * DB の型（bills / faction_stances）とは独立している。
 */

/** index ページから抽出したカテゴリーページへのリンク */
export type TeireiPageLink = {
  /** リンクテキスト（例: 区長提出議案） */
  label: string;
  /** 絶対 URL */
  url: string;
};

/** index ページから抽出した、定例会を構成する各カテゴリーページ */
export type TeireiIndex = {
  /** 区長提出議案ページ URL（無ければ null） */
  kuchogianUrl: string | null;
  /** 委員会提出議案ページ URL（無ければ null） */
  iinkaigianUrl: string | null;
  /** 議員提出議案ページ URL（無ければ null） */
  giingianUrl: string | null;
  /** 報告ページ URL（無ければ null） */
  hokokuUrl: string | null;
  /** 請願・陳情ページ URL（無ければ null） */
  seiganUrl: string | null;
  /** その他ページ URL（無ければ null） */
  sonotaUrl: string | null;
  /** 会派態度ページ URL（無ければ null） */
  taidoUrl: string | null;
};

/** 議案 PDF へのグループリンク（1 PDF が複数議案を含むことがある） */
export type GianPdfLink = {
  /** リンクテキスト（例: 第59号議案から第66号議案） */
  label: string;
  /** 絶対 URL */
  url: string;
  /** PDF が含む議案番号の開始（数値） */
  numberFrom: number;
  /** PDF が含む議案番号の終了（数値、単一なら numberFrom と同じ） */
  numberTo: number;
};

/** 区長提出議案・委員会提出議案・報告の 1 行 */
export type GianRow = {
  /** 番号（テーブルの「番号」列の生値、例: "58"） */
  number: string;
  /** 件名 */
  title: string;
  /** 議決日（または報告日。空文字の場合あり） */
  resultDate: string;
  /** 議決内容（例: 原案可決、否決、-。空文字の場合あり） */
  result: string;
  /** 付託委員会（例: 総務財政、予算特別。空文字の場合あり） */
  committee: string;
};

/** 請願・陳情の 1 行 */
export type SeiganRow = {
  /** 受理番号（例: 8第1号） */
  acceptNumber: string;
  /** 件名 */
  title: string;
  /** 付託日 */
  referredDate: string;
  /** 付託委員会 */
  committee: string;
  /** 議決日 */
  resultDate: string;
  /** 結果（例: 採択、不採択） */
  result: string;
};

/** その他（議員派遣等）の 1 行。番号列が無く件名から始まる構造。 */
export type SonotaRow = {
  /** 件名 */
  title: string;
  /** 議決日 */
  resultDate: string;
  /** 議決内容（例: 原案可決） */
  result: string;
  /** 付託委員会（通常「なし」） */
  committee: string;
};

/** 会派態度テーブルの 1 セル分の解析結果 */
export type StanceCell = {
  /** セルの生テキスト（例: 賛成欠席１） */
  raw: string;
  /** 主たる態度（賛成 / 反対 / 棄権 / 退席 / 欠席 など先頭表記） */
  main: string;
  /** 補足（例: 欠席１）。無ければ空文字 */
  note: string;
};

/** 会派態度テーブルの 1 行 */
export type TaidoRow = {
  /** 議案番号（生値、例: "1" や "委1"） */
  number: string;
  /** 件名 */
  title: string;
  /**
   * 会派列ヘッダー → セル解析結果 のマップ。
   * ヘッダーはサイト表記の略称（例: 自民・無所属、共産、れ新）。
   */
  stancesByFactionColumn: Record<string, StanceCell>;
  /** 結果（例: 原案可決） */
  result: string;
};

/** 会派態度テーブル全体（ヘッダーの会派列と行） */
export type TaidoTable = {
  /** 会派列ヘッダーの一覧（出現順、サイト表記の略称） */
  factionColumns: string[];
  /** データ行 */
  rows: TaidoRow[];
};
