import type { PromptProvider } from "../interface/prompt-provider";
import type { CompiledPrompt, PromptVariables } from "../interface/types";
import { buildBillChatSystemHardPrompt } from "./templates/bill-chat-system-hard";
import { buildBillChatSystemNormalPrompt } from "./templates/bill-chat-system-normal";
import { buildTopChatSystemPrompt } from "./templates/top-chat-system";

const BILL_REQUIRED_KEYS = [
  "billName",
  "billTitle",
  "billSummary",
  "billContent",
] as const;

/** 法案チャットプロンプトの必須変数を検証して返す */
function validateBillVariables(
  v: PromptVariables,
  promptName: string
): {
  billName: string;
  billTitle: string;
  billSummary: string;
  billContent: string;
} {
  const { billName, billTitle, billSummary, billContent } = v;
  if (
    billName === undefined ||
    billTitle === undefined ||
    billSummary === undefined ||
    billContent === undefined
  ) {
    const missing = BILL_REQUIRED_KEYS.filter((key) => !(key in v));
    throw new Error(
      `Missing required variables for prompt "${promptName}": ${missing.join(", ")}`
    );
  }
  return { billName, billTitle, billSummary, billContent };
}

/** プロンプト名からビルド関数へのマップ */
const PROMPT_BUILDERS: Record<string, (variables: PromptVariables) => string> =
  {
    "top-chat-system": (v) => {
      if (!v.billSummary) {
        throw new Error(
          'Missing required variable "billSummary" for prompt "top-chat-system"'
        );
      }
      return buildTopChatSystemPrompt(v.billSummary);
    },
    "bill-chat-system-normal": (v) => {
      const { billName, billTitle, billSummary, billContent } =
        validateBillVariables(v, "bill-chat-system-normal");
      return buildBillChatSystemNormalPrompt(
        billName,
        billTitle,
        billSummary,
        billContent,
        v.knowledgeSource
      );
    },
    "bill-chat-system-hard": (v) => {
      const { billName, billTitle, billSummary, billContent } =
        validateBillVariables(v, "bill-chat-system-hard");
      return buildBillChatSystemHardPrompt(
        billName,
        billTitle,
        billSummary,
        billContent,
        v.knowledgeSource
      );
    },
  };

/** ソースコードで管理するプロンプト名の一覧 */
export const SOURCE_CODE_PROMPT_NAMES: ReadonlySet<string> = new Set(
  Object.keys(PROMPT_BUILDERS)
);

/**
 * ソースコードに定義されたプロンプトテンプレートを返すプロバイダー
 */
export class SourceCodePromptProvider implements PromptProvider {
  async getPrompt(
    name: string,
    variables?: PromptVariables
  ): Promise<CompiledPrompt> {
    const builder = PROMPT_BUILDERS[name];
    if (!builder) {
      throw new Error(
        `Source code prompt not found: "${name}". Available: ${Object.keys(PROMPT_BUILDERS).join(", ")}`
      );
    }

    const content = builder(variables ?? {});
    const metadata = JSON.stringify({ source: "source-code", name });

    return { content, metadata };
  }
}
