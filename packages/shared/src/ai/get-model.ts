import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";

/**
 * AI_MODELS の値（Gemini モデル名）を受け取り、Vercel AI SDK で利用できる
 * LanguageModel オブジェクトを返す。
 *
 * 認証は2系統を環境変数で切り替える:
 *
 * 1. GEMINI_API_KEY がある場合 → Gemini Developer API（AI Studio のキー）。
 *    キー/プロジェクトに支出上限・無料枠の上限を効かせられるため、上限到達時は
 *    Google が 429 を返す。アプリ層のバグや抜け道に依存しないハードなコスト
 *    天井になる。公開チャット（濫用面）の web Cloud Run にのみ設定する想定。
 *
 * 2. GEMINI_API_KEY が無い場合 → Vertex AI（Application Default Credentials）。
 *    - ローカル: `gcloud auth application-default login`
 *    - Cloud Run: アタッチしたサービスアカウントのメタデータサーバを自動利用
 *    admin など内部処理はこちらを使う。
 *
 * モデル識別子（gemini-2.5-flash 等）は両系統で共通なので呼び出し側は無改修。
 */
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleAI = geminiApiKey
  ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
  : null;

export function getModel(modelId: string) {
  if (googleAI) {
    return googleAI(modelId);
  }
  return vertex(modelId);
}
