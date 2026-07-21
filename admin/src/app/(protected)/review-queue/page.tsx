import { ReviewQueueItem } from "@/features/interview-reports/server/components/review-queue-item";
import { findPendingReviewItems } from "@/features/interview-reports/server/repositories/review-queue-repository";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const items = await findPendingReviewItems();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl text-gray-900">承認キュー</h1>
        <p className="text-sm text-gray-600">
          モデレーション基準または要約忠実性の判定で自動公開されず、承認待ちに
          なった住民の声です。対話ログと判定理由を確認し、公開（承認）または
          却下してください。承認すると匿名で集計・掲載の対象になります。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 border-dashed bg-white p-10 text-center text-gray-500">
          承認待ちのレポートはありません。
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500">
            {items.length} 件が承認待ちです。
          </div>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <ReviewQueueItem key={item.reportId} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
