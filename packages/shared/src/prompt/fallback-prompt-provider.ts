import type { PromptProvider } from "./prompt-provider";
import type { CompiledPrompt, PromptVariables } from "./types";

/**
 * Langfuse が無い環境向けのフォールバックプロンプト実装（旧称 MockPromptProvider）。
 * web / apps-api の両方から使う単一ソース。
 *
 * 本番では Langfuse 経由でプロンプトを差し替える運用を想定するが、
 * Vertex AI + Cloud Run 構成で Langfuse 未契約の環境でも動かせるように
 * ベースのシステムプロンプトを直書きで提供する。
 */
export class FallbackPromptProvider implements PromptProvider {
  async getPrompt(
    name: string,
    variables?: PromptVariables
  ): Promise<CompiledPrompt> {
    const v = variables ?? {};
    const template = TEMPLATES[name] ?? DEFAULT_TEMPLATE;
    const content = renderTemplate(template, v);
    return { content, metadata: `mock:${name}` };
  }
}

function renderTemplate(template: string, variables: PromptVariables): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => variables[key] ?? ""
  );
}

const COMMON_HEADER = `あなたは「みらい議会＠大田区」の AI アシスタントです。
大田区議会で議論されている議案について、住民にやさしい言葉でわかりやすく解説します。
事実に基づき、根拠が不明な点は推測ではなく「公開情報からは確認できません」と回答してください。
回答は日本語で、Markdown 記法を使って読みやすく構造化してください。`;

const DEFAULT_TEMPLATE = COMMON_HEADER;

const TEMPLATES: Record<string, string> = {
  "top-chat-system": `${COMMON_HEADER}

ユーザーが議案を選んでいない状況なので、以下の議案一覧を踏まえて答えてください:
{{billSummary}}

議案の詳細を聞かれたら、適切な議案ページへ移動するよう案内してください。`,

  "bill-chat-system-easy": `${COMMON_HEADER}

# 対象議案
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 概要: {{billSummary}}
- 本文: {{billContent}}

# 回答スタイル
中学生でも理解できるよう、専門用語を避けてやさしい言葉で説明してください。
1段落200字以内、箇条書きを活用してください。`,

  "bill-chat-system-normal": `${COMMON_HEADER}

# 対象議案
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 概要: {{billSummary}}
- 本文: {{billContent}}

# 回答スタイル
一般的な大人が読んで理解できる程度の言葉で、要点を整理して回答してください。`,

  "bill-chat-system-hard": `${COMMON_HEADER}

# 対象議案
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 概要: {{billSummary}}
- 本文: {{billContent}}

# 回答スタイル
法律や政策に関心のある層を想定し、条文との対応・財政への影響・近隣自治体の動向など掘り下げた回答をしてください。`,
};
