import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CONFIG_STATUS_TABS,
  type ConfigStatus,
} from "../features/interview-configs/config-labels";
import { ConfigRow } from "../features/interview-configs/config-row";
import { useInterviewConfigs } from "../features/interview-configs/interview-configs-queries";

export const Route = createFileRoute("/interview-configs")({
  component: InterviewConfigsPage,
});

const COLSPAN = 6;

function InterviewConfigsPage() {
  const [status, setStatus] = useState<ConfigStatus | "all">("all");
  const {
    data: configs,
    isPending,
    isError,
    error,
  } = useInterviewConfigs(status);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">インタビュー設定</h1>
        <p className="text-slate-500 text-sm">
          議案・テーマ・取り組みごとの匿名インタビューを管理します。「受付中」は住民が回答でき、「終了」にすると新規回答を停止します（設定は住民が回答を始めた時に自動作成されます）。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CONFIG_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === tab.value
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">対象</th>
              <th className="px-3 py-2 font-medium">設定名</th>
              <th className="w-20 px-3 py-2 text-center font-medium">状態</th>
              <th className="w-32 px-3 py-2 font-medium">モード</th>
              <th className="w-20 px-3 py-2 text-center font-medium">回答数</th>
              <th className="w-48 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : configs.length === 0 ? (
              <StatusRow>該当するインタビュー設定はありません。</StatusRow>
            ) : (
              configs.map((config) => (
                <ConfigRow key={config.id} config={config} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td
        colSpan={COLSPAN}
        className={`px-3 py-8 text-center text-slate-500 ${className ?? ""}`}
      >
        {children}
      </td>
    </tr>
  );
}
