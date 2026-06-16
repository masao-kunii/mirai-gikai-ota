/**
 * インタビューチャットで選択可能なAIモデルの定義（Vertex AI Gemini）
 */

import { DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";
import {
  estimateInterviewCostUsd,
  formatEstimatedCost,
} from "./estimate-interview-cost";

type ChatModelOption = {
  value: string;
  label: string;
  estimatedCost: string | null;
};

export type ChatModelGroup = {
  provider: string;
  options: ChatModelOption[];
};

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
] as const;

/** フラットなモデル一覧（バリデーション用） */
export const CHAT_MODEL_OPTIONS = [...GEMINI_MODELS] as const;

export type ChatModelValue = (typeof CHAT_MODEL_OPTIONS)[number]["value"];

function buildGroupOptions(
  models: ReadonlyArray<{ value: string; label: string }>
): ChatModelOption[] {
  return models.map((m) => {
    const cost = estimateInterviewCostUsd(m.value);
    return {
      value: m.value,
      label: m.label,
      estimatedCost: cost !== null ? formatEstimatedCost(cost) : null,
    };
  });
}

/** プロバイダー別にグループ化されたモデル一覧（UI表示用） */
export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
  { provider: "Google Vertex AI", options: buildGroupOptions(GEMINI_MODELS) },
];

/** 文字列が有効なチャットモデルIDかどうかを検証する */
export function isValidChatModel(model: string): model is ChatModelValue {
  return CHAT_MODEL_OPTIONS.some((opt) => opt.value === model);
}

/** デフォルトモデルの表示ラベル（例: "Gemini 2.5 Pro ~29円/回"） */
export const DEFAULT_MODEL_LABEL = (() => {
  const model = CHAT_MODEL_OPTIONS.find(
    (opt) => opt.value === DEFAULT_INTERVIEW_CHAT_MODEL
  );
  const cost = estimateInterviewCostUsd(DEFAULT_INTERVIEW_CHAT_MODEL);
  const costStr = cost !== null ? ` ${formatEstimatedCost(cost)}/回` : "";
  return `${model?.label ?? DEFAULT_INTERVIEW_CHAT_MODEL}${costStr}`;
})();
