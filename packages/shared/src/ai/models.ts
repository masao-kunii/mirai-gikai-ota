/**
 * AIモデルの識別子を一元管理する定数（Vertex AI Gemini モデル名）。
 *
 * 既存コードとの互換性のために旧 OpenAI/Anthropic 系のキーも残しているが、
 * 値はすべて Vertex AI で利用できる Gemini モデルにマッピングされている。
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

  // --- Google Gemini ---
  gemini2_5_flash: "gemini-2.5-flash",
  gemini2_5_pro: "gemini-2.5-pro",
  gemini2_5_flash_lite: "gemini-2.5-flash-lite",
  /** Gemini 3.1 Flash-Lite。2.5-flash より新しく安価（$0.25/$1.50）。
   *  公開チャットで使用（Developer API キー経由）。 */
  gemini3_1_flash_lite: "gemini-3.1-flash-lite",

  // --- 旧 OpenAI 系の互換エイリアス（→ Gemini 等価モデル） ---
  gpt4o: "gemini-2.5-flash",
  gpt4o_mini: "gemini-2.5-flash-lite",
  gpt4_1: "gemini-2.5-pro",
  gpt4_1_mini: "gemini-2.5-flash",
  gpt4_1_nano: "gemini-2.5-flash-lite",
  o3_mini: "gemini-2.5-flash",
  o4_mini: "gemini-2.5-flash",
  gpt5: "gemini-2.5-pro",
  gpt5_mini: "gemini-2.5-flash",
  gpt5_nano: "gemini-2.5-flash-lite",
  gpt5_chat: "gemini-2.5-flash",
  gpt5_1_instant: "gemini-2.5-flash",
  gpt5_1_thinking: "gemini-2.5-pro",
  gpt5_2: "gemini-2.5-pro",

  // --- 旧 Gemini 3 系の互換エイリアス（暫定で 2.5 系に寄せる） ---
  gemini3_flash: "gemini-2.5-flash",
  gemini3_flash_preview: "gemini-2.5-flash",
  gemini3_1_pro_preview: "gemini-2.5-pro",
  gemini3_1_flash_lite_preview: "gemini-2.5-flash-lite",

  // --- 旧 Anthropic 系の互換エイリアス（→ Gemini 等価モデル） ---
  claude_haiku_4_5: "gemini-2.5-flash",
  claude_sonnet_4_6: "gemini-2.5-pro",
  claude_opus_4_6: "gemini-2.5-pro",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/** インタビューチャットのデフォルトモデル */
export const DEFAULT_INTERVIEW_CHAT_MODEL = AI_MODELS.pro;
