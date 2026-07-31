/**
 * 取り込みで使う DB enum のリテラル型。
 *
 * 新アーキ（apps/api + Drizzle）でも旧スタックでも使えるよう、生成型に依存せず
 * ここでユニオン型として定義する。値は supabase/migrations の pgEnum と一致させること。
 */

export type BillStatus =
  | "preparing"
  | "submitted"
  | "in_committee"
  | "plenary_session"
  | "approved"
  | "rejected"
  | "adopted"
  | "partially_adopted";

export type ProposalType =
  | "mayor_bill"
  | "committee_bill"
  | "report"
  | "petition"
  | "member_bill"
  | "other";

export type StanceType =
  | "for"
  | "against"
  | "neutral"
  | "conditional_for"
  | "conditional_against"
  | "considering"
  | "continued_deliberation";
