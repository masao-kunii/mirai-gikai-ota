import { vertex } from "@ai-sdk/google-vertex";

/**
 * AI_MODELS の値（Vertex AI Gemini モデル名）を受け取り、
 * Vercel AI SDK で利用できる LanguageModel オブジェクトを返す。
 *
 * 認証は Application Default Credentials を使用する：
 * - ローカル: `gcloud auth application-default login`
 * - Cloud Run: アタッチしたサービスアカウントのメタデータサーバを自動利用
 *
 * 環境変数:
 * - GOOGLE_VERTEX_PROJECT または GOOGLE_CLOUD_PROJECT
 * - GOOGLE_VERTEX_LOCATION（例: asia-northeast1）
 */
export function getModel(modelId: string) {
  return vertex(modelId);
}
