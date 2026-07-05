import type { DbClient } from "@mirai-gikai/db";
import { schema, withAppAdmin } from "@mirai-gikai/db";
import {
  calculateUsageCostUsd,
  sanitizeUsage,
} from "@mirai-gikai/shared/ai/calculate-cost";
import type { LanguageModelUsage } from "@mirai-gikai/shared/ai/sdk";
import { and, eq } from "drizzle-orm";

const { bills, billContents, chatUsageEvents } = schema;

export type BillChatContext = {
  billName: string;
  billTitle: string;
  billSummary: string;
  billContent: string;
  knowledgeSource: string;
};

/**
 * チャットのプロンプト変数を published な議案からサーバー側で組み立てる。
 * クライアントのメタデータは信頼しない（非公開ナレッジ流出防止と
 * 管理画面トグルの強制。web 版 handle-chat-request と同一方針）。
 *
 * knowledge_source は public_reader からカラム除外されているため
 * app_admin で読む。値は LLM の system prompt にのみ入り、
 * HTTP レスポンスには決して含めない。
 */
export async function fetchBillChatContext(
  db: DbClient,
  billId: string,
  difficultyLevel: "normal" | "hard"
): Promise<BillChatContext | null> {
  return withAppAdmin(db, async (tx) => {
    const [bill] = await tx
      .select({
        name: bills.name,
        knowledgeSource: bills.knowledgeSource,
        useKnowledgeSourceInChat: bills.useKnowledgeSourceInChat,
      })
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.publishStatus, "published")));
    if (!bill) return null;

    const [content] = await tx
      .select({
        title: billContents.title,
        summary: billContents.summary,
        content: billContents.content,
      })
      .from(billContents)
      .where(
        and(
          eq(billContents.billId, billId),
          eq(billContents.difficultyLevel, difficultyLevel)
        )
      );

    return {
      billName: bill.name,
      billTitle: content?.title ?? "",
      billSummary: content?.summary ?? "",
      billContent: content?.content ?? "",
      knowledgeSource: bill.useKnowledgeSourceInChat
        ? (bill.knowledgeSource ?? "")
        : "",
    };
  });
}

type RecordChatUsageParams = {
  anonId: string;
  model: string;
  usage: LanguageModelUsage;
  providerCostUsd?: number;
  metadata?: Record<string, unknown>;
};

/**
 * 使用量とコストを記録する（ストリーミング完了後の「後処理」。
 * TARGET_ARCHITECTURE §3.3 の3分割の最終段）。
 * プロバイダ実コストが取れない場合は価格表から算出、それも不能なら 0 で記録。
 */
export async function recordChatUsage(
  db: DbClient,
  { anonId, model, usage, providerCostUsd, metadata }: RecordChatUsageParams
): Promise<void> {
  const sanitized = sanitizeUsage(usage);
  let costUsd = providerCostUsd;
  if (costUsd === undefined) {
    try {
      costUsd = calculateUsageCostUsd(model, sanitized);
    } catch (e) {
      console.error("Failed to calculate usage cost:", e);
      costUsd = 0;
    }
  }

  await withAppAdmin(db, (tx) =>
    tx.insert(chatUsageEvents).values({
      userId: anonId,
      model,
      inputTokens: sanitized.inputTokens,
      outputTokens: sanitized.outputTokens,
      totalTokens: sanitized.totalTokens,
      costUsd: String(costUsd),
      metadata: metadata ?? null,
    })
  );
}
