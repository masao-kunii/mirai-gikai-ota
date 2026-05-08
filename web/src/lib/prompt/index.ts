import { getLangfuseClient } from "./langfuse/client";
import { LangfusePromptProvider } from "./langfuse/langfuse-prompt-provider";
import { MockPromptProvider } from "./mock-prompt-provider";
import type { PromptProvider } from "./interface/prompt-provider";

/**
 * プロンプトプロバイダーの作成処理
 *
 * Langfuse の認証情報が設定されている場合は LangfusePromptProvider を返し、
 * 設定されていない（ローカル開発や Langfuse 未契約の自前ホスト環境）場合は
 * 直書きプロンプトを返す MockPromptProvider にフォールバックする。
 */
export function createPromptProvider(): PromptProvider {
  if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
    try {
      const client = getLangfuseClient();
      return new LangfusePromptProvider(client);
    } catch (error) {
      console.warn(
        "Langfuse client init failed, falling back to MockPromptProvider:",
        error
      );
    }
  }
  return new MockPromptProvider();
}

export type { CompiledPrompt, PromptVariables } from "./interface/types";
export type { PromptProvider } from "./interface/prompt-provider";
