/**
 * 大田区議会サイトの表記を DB の値へ変換する純粋マッピング関数群。
 *
 * - 議決内容 → bill_status_enum
 * - 会派態度セルの主表記 → stance_type_enum
 * - 会派態度ページの列ヘッダー略称 → DB 会派の display_name 候補
 * - 議案番号の整形（種別ごとに会期内で一意になる bill_number を作る）
 */

import type { BillStatus, StanceType } from "./enums";

/**
 * 議案の議決内容（区長提出議案・委員会提出議案）を bill_status_enum へ変換する。
 * 空文字（未議決）は submitted（提出済み）とする。
 */
export function mapGianResultToStatus(result: string): BillStatus {
  const r = result.replace(/\s+/g, "");
  if (!r) return "submitted";
  if (r.includes("否決")) return "rejected";
  if (r.includes("可決") || r.includes("同意") || r.includes("原案")) {
    return "approved";
  }
  if (r.includes("継続")) return "in_committee";
  if (r.includes("採択")) {
    return r.includes("不採択") ? "rejected" : "adopted";
  }
  return "submitted";
}

/**
 * 請願・陳情の結果を bill_status_enum へ変換する。
 * 採択 → adopted、不採択 → rejected、継続審査 → in_committee、空 → submitted。
 */
export function mapSeiganResultToStatus(result: string): BillStatus {
  const r = result.replace(/\s+/g, "");
  if (!r) return "submitted";
  if (r.includes("不採択")) return "rejected";
  if (r.includes("採択")) return "adopted";
  if (r.includes("継続")) return "in_committee";
  if (r.includes("取下")) return "rejected";
  return "submitted";
}

/**
 * 会派態度セルの主表記を stance_type_enum へ変換する。
 * 賛成 → for、反対 → against、棄権/退席 → neutral。
 * 欠席のみのセルは「態度なし」として null を返す（スタンス登録対象外）。
 */
export function mapStanceMainToType(main: string): StanceType | null {
  const m = main.replace(/\s+/g, "");
  if (m.startsWith("賛成")) return "for";
  if (m.startsWith("反対")) return "against";
  if (m.startsWith("棄権") || m.startsWith("退席")) return "neutral";
  if (m.startsWith("欠席")) return null;
  return null;
}

/**
 * 会派態度ページの列ヘッダー（サイト表記の略称）→ DB 会派の照合キー候補。
 *
 * findFactionByName は display_name / alternative_names と完全一致で照合するため、
 * サイト略称（自民・無所属 等）を DB の display_name にマッピングする。
 * 値は data.ts の factions[].display_name と一致させること。
 */
export const FACTION_COLUMN_TO_DISPLAY_NAME: Record<string, string> = {
  "自民・無所属": "自民党・無所属の会",
  公明: "公明党",
  つばさ: "つばさ",
  // 令和8年4月の会派再編: つばさ → 大田区無所属議員団（略称「無所属」）
  無所属: "大田区無所属議員団",
  共産: "共産党",
  立憲: "立憲民主党",
  維新: "維新の会",
  "都ファ・国民": "都ファ・国民",
  // 都ファ・国民の解散後に新設（とく山れいこ）。略称「国民」
  国民: "大田区議会国民民主党",
  フェア民: "フェアな民主主義",
  れ新: "れいわ新選組",
  子ども防災: "子ども防災会",
  創志: "未来創志会",
};

/**
 * 会派列ヘッダーを DB 照合用の名称へ変換する。
 * マッピングに無い場合はヘッダーそのものを返す（display_name 直一致を期待）。
 */
export function factionColumnToDisplayName(column: string): string {
  return FACTION_COLUMN_TO_DISPLAY_NAME[column] ?? column;
}

/** 区長提出議案の番号（数値文字列）→ 表示用 bill_number（"58" → "第58号議案"）。
 * 会派態度ページが委員会提出議案を "委1" で参照することがあるため、"委N" 形式も
 * 委員会提出議案として扱う（taido 照合のため）。 */
export function formatGianBillNumber(rawNumber: string): string {
  const n = rawNumber.trim();
  // 委員会提出議案: "委1" → "委員会第1号議案"
  const iinkai = n.match(/^委(\d+)$/);
  if (iinkai) return `委員会第${iinkai[1]}号議案`;
  if (/^\d+$/.test(n)) return `第${n}号議案`;
  return n;
}

/** 委員会提出議案の番号 → 表示用 bill_number（"1" → "委員会第1号議案"）。
 * 区長提出議案と番号が衝突する（どちらも 第1号…）ため、専用の接頭辞を付けて
 * 会期内で一意にする。会派態度ページの "委1" 参照とも一致する。 */
export function formatIinkaiBillNumber(rawNumber: string): string {
  const n = rawNumber.trim();
  const m = n.match(/^委?(\d+)$/);
  if (m) return `委員会第${m[1]}号議案`;
  return n;
}

/** 報告番号 → 表示用 bill_number（"1" → "報告第1号"） */
export function formatHokokuBillNumber(rawNumber: string): string {
  const n = rawNumber.trim();
  if (/^\d+$/.test(n)) return `報告第${n}号`;
  return n;
}

/** 議員提出議案の番号 → 表示用 bill_number（"1" → "議員提出第1号議案"）。
 *  区長/委員会提出議案と番号が衝突しないよう専用接頭辞を付ける。 */
export function formatMemberBillNumber(rawNumber: string): string {
  const n = rawNumber.trim();
  const m = n.match(/^議員?(\d+)$/) ?? n.match(/^(\d+)$/);
  if (m) return `議員提出第${m[1]}号議案`;
  return n;
}

/** その他は番号が無いため、出現順の連番から bill_number を作る（"その他第N号"）。 */
export function formatSonotaBillNumber(index: number): string {
  return `その他第${index}号`;
}

/**
 * 会派態度ページの議案番号を、議案側の bill_number 形式へ正規化して照合できるようにする。
 * 会派態度ページは議案種別ごとに接頭辞付きで番号を振る:
 *   - 区長提出議案:   "58"   → "第58号議案"       (formatGianBillNumber)
 *   - 委員会提出議案: "委1"  → "委員会第1号議案"   (formatGianBillNumber)
 *   - 議員提出議案:   "議1"  → "議員提出第1号議案" (formatMemberBillNumber)
 * 議員提出の条例等（例: 「大田区高齢者補聴器購入費助成条例」）は "議N" で参照されるため、
 * 議員提出形式へ正規化しないと議案が照合できず会派見解が丸ごとスキップされる。
 */
export function taidoNumberToGianBillNumber(rawNumber: string): string {
  const n = rawNumber.trim();
  // 議員提出議案: "議1" / "議員1" / "議提1" → "議員提出第1号議案"
  const member = n.match(/^議(?:員|提)?(\d+)$/);
  if (member?.[1] !== undefined) return formatMemberBillNumber(member[1]);
  return formatGianBillNumber(n);
}

/** 付託委員会の略称 → committees.name（「委員会」を補う） */
export function normalizeCommitteeName(committee: string): string {
  const c = committee.trim();
  if (!c) return "";
  if (c.endsWith("委員会")) return c;
  return `${c}委員会`;
}
