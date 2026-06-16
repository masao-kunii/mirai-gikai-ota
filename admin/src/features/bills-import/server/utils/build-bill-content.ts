/**
 * 取り込んだ議案の bill_contents（公開表示用本文）を、公式情報のみから
 * 事実ベースで生成する純粋関数。
 *
 * AI による推測要約は行わない（行政情報の正確性を最優先するため）。
 * 件名・種別・会期・付託委員会・議決状況・公式 PDF リンクといった
 * 大田区議会サイトに掲載された一次情報のみを Markdown に整形する。
 */

import type { Database } from "@mirai-gikai/supabase";

type BillStatus = Database["public"]["Enums"]["bill_status_enum"];
type ProposalType = Database["public"]["Enums"]["proposal_type_enum"];

const PROPOSAL_TYPE_LABEL: Record<ProposalType, string> = {
  mayor_bill: "区長提出議案",
  committee_bill: "委員会提出議案",
  report: "報告",
  petition: "請願・陳情",
};

const STATUS_LABEL: Record<BillStatus, string> = {
  preparing: "準備中",
  submitted: "上程済み",
  in_committee: "委員会審査中",
  plenary_session: "本会議採決中",
  approved: "可決",
  rejected: "否決",
  adopted: "採択",
  partially_adopted: "趣旨採択",
};

export type BuildBillContentInput = {
  title: string;
  billNumber: string;
  proposalType: ProposalType;
  status: BillStatus;
  /** 会期名（例: 令和8年第2回定例会） */
  sessionName: string;
  /** 付託委員会名（無ければ空文字） */
  committee?: string;
  /** 議決日（無ければ空文字） */
  resultDate?: string;
  /** 議決内容の原文（無ければ空文字。例: 原案可決（賛成者多数）） */
  resultText?: string;
  /** 公式 PDF の URL（無ければ空文字） */
  pdfUrl?: string;
};

export type BuiltBillContent = {
  title: string;
  summary: string;
  content: string;
};

/**
 * 公開用 summary（一覧カードに出る短い説明）を事実ベースで作る。
 */
function buildSummary(input: BuildBillContentInput): string {
  const typeLabel = PROPOSAL_TYPE_LABEL[input.proposalType];
  const subject =
    input.proposalType === "petition"
      ? `${input.sessionName}で審査された${typeLabel}です。`
      : input.proposalType === "report"
        ? `${input.sessionName}で大田区から議会へ提出された${typeLabel}です。`
        : `${input.sessionName}に提出された${typeLabel}です。`;
  const statusPart =
    input.status === "submitted"
      ? ""
      : `現在の状況: ${STATUS_LABEL[input.status]}。`;
  return `${subject}${statusPart}`.trim();
}

/**
 * 公開用 content（詳細本文 Markdown）を事実ベースで作る。
 */
function buildContent(input: BuildBillContentInput): string {
  const typeLabel = PROPOSAL_TYPE_LABEL[input.proposalType];
  const lines: string[] = [];

  lines.push(`## ${input.title}`);
  lines.push("");
  lines.push("### 基本情報");
  lines.push("");
  lines.push(`- 種別: ${typeLabel}`);
  lines.push(`- 番号: ${input.billNumber}`);
  lines.push(`- 会期: ${input.sessionName}`);
  if (input.committee) {
    lines.push(`- 付託委員会: ${input.committee}`);
  }
  lines.push(`- 審議状況: ${STATUS_LABEL[input.status]}`);
  if (input.resultDate) {
    lines.push(`- 議決日: ${input.resultDate}`);
  }
  if (input.resultText) {
    lines.push(`- 議決結果: ${input.resultText}`);
  }
  lines.push("");

  if (input.pdfUrl) {
    lines.push("### 原文");
    lines.push("");
    lines.push(`[大田区議会の公式 PDF を見る](${input.pdfUrl})`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "この内容は大田区議会の公開情報（区議会サイト）を基に自動で取り込んだものです。正確な内容は公式 PDF・議事録をご確認ください。"
  );

  return lines.join("\n");
}

/**
 * bill_contents の title / summary / content を生成する。
 * normal / hard どちらの難易度でも同じ内容を使う（事実情報のため難易度差は設けない）。
 */
export function buildBillContent(
  input: BuildBillContentInput
): BuiltBillContent {
  return {
    title: input.title,
    summary: buildSummary(input),
    content: buildContent(input),
  };
}
