import { AI_MODELS } from "@mirai-gikai/shared/ai/models";

/**
 * インタビューで使うモデルを解決する。
 * 既定は gemini-3.8-flash。INTERVIEW_MODEL 環境変数、
 * または設定の chat_model で上書き可能。get-model が GEMINI_API_KEY 有無で
 * Developer API / Vertex を切り替える。
 */
export function resolveInterviewModel(configChatModel?: string | null): string {
  return (
    process.env.INTERVIEW_MODEL ?? configChatModel ?? AI_MODELS.gemini3_8_flash
  );
}
