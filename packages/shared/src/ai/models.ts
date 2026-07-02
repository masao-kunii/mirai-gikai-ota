/**
 * AIモデルの識別子を一元管理する定数（Vertex AI Gemini モデル名）。
 *
 * 用途別の論理名（flash / pro / flash_lite）と、実在する個別モデル名で構成する。
 * 値はすべて Vertex AI / Gemini Developer API で利用できる Gemini モデル。
 *
 * 実体の `LanguageModel` オブジェクトは
 * `@mirai-gikai/shared/ai/get-model` の `getModel()` 経由で取得すること。
 */
export const AI_MODELS = {
  // --- 推奨: 用途別の論理名 ---
  /** 標準のチャット/インタビュー用途。低レイテンシ・低コスト。 */
  flash: "gemini-2.5-flash",
  /** 高品質が必要な要約・分類・分析用途。 */
  pro: "gemini-2.5-pro",
  /** トリビアルなタスク（モデレーション等）向けの最安モデル。 */
  flash_lite: "gemini-2.5-flash-lite",

  /** Gemini 3.1 Flash-Lite。2.5-flash より新しく安価（$0.25/$1.50）。
   *  公開チャットで使用（Developer API キー経由）。 */
  gemini3_1_flash_lite: "gemini-3.1-flash-lite",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/** インタビューチャットのデフォルトモデル */
export const DEFAULT_INTERVIEW_CHAT_MODEL = AI_MODELS.pro;
