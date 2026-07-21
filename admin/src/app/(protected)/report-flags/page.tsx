import { Badge } from "@/components/ui/badge";
import { UnpublishReportButton } from "@/features/interview-reports/client/components/unpublish-report-button";
import { findFlaggedReports } from "@/features/interview-reports/server/repositories/report-flags-repository";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  personal_info: "個人情報",
  inappropriate: "不適切・攻撃的",
  inaccurate: "事実と異なる",
  spam: "スパム",
  other: "その他",
};

export default async function ReportFlagsPage() {
  const items = await findFlaggedReports();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl text-gray-900">通報</h1>
        <p className="text-gray-600 text-sm">
          公開中の意見に対して住民から寄せられた通報です。内容を確認し、必要なら
          非公開にしてください。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 border-dashed bg-white p-10 text-center text-gray-500">
          通報はありません。
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.reportId}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  通報 {item.flagCount} 件
                </Badge>
                {item.reasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-gray-600">
                    {REASON_LABEL[r] ?? r}
                  </Badge>
                ))}
                {item.roleTitle && (
                  <span className="text-gray-500 text-xs">
                    {item.roleTitle}
                  </span>
                )}
                {!item.isPublicByAdmin && (
                  <span className="text-gray-400 text-xs">（非公開）</span>
                )}
              </div>

              <div>
                <div className="mb-1 font-medium text-gray-400 text-xs">
                  対象の意見（要約）
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {item.summary ?? "（要約なし）"}
                </p>
              </div>

              {item.details.length > 0 && (
                <div className="flex flex-col gap-1 rounded-md bg-gray-50 p-3">
                  <div className="font-medium text-gray-500 text-xs">
                    通報者の補足
                  </div>
                  {item.details.map((d, i) => (
                    <p
                      key={`${item.reportId}-detail-${i}`}
                      className="text-gray-700 text-xs leading-relaxed"
                    >
                      ・{d}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end border-gray-100 border-t pt-3">
                <UnpublishReportButton
                  reportId={item.reportId}
                  isPublic={item.isPublicByAdmin}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
