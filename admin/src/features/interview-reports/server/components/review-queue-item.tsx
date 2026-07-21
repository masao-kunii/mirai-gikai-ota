import { MODERATION_CATEGORY_LABELS } from "@mirai-gikai/shared/moderation/schemas";
import { Badge } from "@/components/ui/badge";
import { ReviewActions } from "../../client/components/review-actions";
import { findInterviewMessagesBySessionId } from "../repositories/interview-report-repository";
import type { PendingReviewItem } from "../repositories/review-queue-repository";

const TARGET_LABEL: Record<string, string> = {
  bill: "議案",
  theme: "テーマ",
  initiative: "取り組み",
};
const STANCE_LABEL: Record<string, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
};

/** 保存済み assistant メッセージ（JSON文字列）から表示テキストを取り出す。 */
function assistantText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.text === "string") return parsed.text;
  } catch {
    // JSON でなければそのまま
  }
  return content;
}

function categoryLabel(key: string): string {
  return (MODERATION_CATEGORY_LABELS as Record<string, string>)[key] ?? key;
}

export async function ReviewQueueItem({ item }: { item: PendingReviewItem }) {
  const messages = await findInterviewMessagesBySessionId(item.sessionId);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      {/* ヘッダー: 対象・立場 */}
      <div className="flex flex-wrap items-center gap-2">
        {item.target ? (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            {TARGET_LABEL[item.target.type] ?? item.target.type}:{" "}
            {item.target.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-500">
            対象不明
          </Badge>
        )}
        {item.roleTitle && (
          <span className="text-sm text-gray-600">{item.roleTitle}</span>
        )}
        {item.stance && (
          <span className="text-xs text-gray-400">
            立場: {STANCE_LABEL[item.stance] ?? item.stance}
          </span>
        )}
      </div>

      {/* 要約 */}
      <div>
        <div className="mb-1 text-xs font-medium text-gray-400">要約</div>
        <p className="text-sm leading-relaxed text-gray-800">
          {item.summary ?? "（要約なし）"}
        </p>
      </div>

      {/* 承認待ちの理由: モデレーション & 忠実性 */}
      <div className="flex flex-col gap-3 rounded-md bg-gray-50 p-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              モデレーション
            </span>
            <span className="text-xs text-gray-500">
              スコア {item.moderationScore ?? "-"}
            </span>
            {item.moderationCategories.length > 0 ? (
              item.moderationCategories.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  {categoryLabel(c)}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-gray-400">該当カテゴリなし</span>
            )}
          </div>
          {item.moderationReasoning && (
            <p className="text-xs leading-relaxed text-gray-600">
              {item.moderationReasoning}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">忠実性</span>
            {item.faithfulnessOk === false ? (
              <Badge
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700"
              >
                NG（対話ログと不一致の疑い）
              </Badge>
            ) : item.faithfulnessOk === true ? (
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700"
              >
                OK
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                未確認
              </Badge>
            )}
          </div>
          {item.faithfulnessReasoning && (
            <p className="text-xs leading-relaxed text-gray-600">
              {item.faithfulnessReasoning}
            </p>
          )}
        </div>
      </div>

      {/* 対話ログ（折りたたみ） */}
      <details className="rounded-md border border-gray-100">
        <summary className="cursor-pointer px-3 py-2 text-sm text-gray-600">
          対話ログを表示（{messages.length} 件）
        </summary>
        <div className="flex flex-col gap-2 border-gray-100 border-t px-3 py-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm leading-relaxed">
              <span
                className={
                  m.role === "user"
                    ? "font-medium text-blue-700"
                    : "font-medium text-gray-500"
                }
              >
                {m.role === "user" ? "回答者" : "AI"}:
              </span>{" "}
              <span className="whitespace-pre-wrap text-gray-800">
                {m.role === "assistant" ? assistantText(m.content) : m.content}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* 操作 */}
      <div className="flex justify-end border-gray-100 border-t pt-3">
        <ReviewActions reportId={item.reportId} />
      </div>
    </div>
  );
}
