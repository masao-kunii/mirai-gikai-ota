import { createFileRoute } from "@tanstack/react-router";
import { CreateTagForm } from "../features/tags/create-tag-form";
import { TagRow } from "../features/tags/tag-row";
import { useTags } from "../features/tags/tags-queries";

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});

function TagsPage() {
  const { data: tags, isPending, isError, error } = useTags();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-bold text-slate-900 text-xl">タグ管理</h1>
        <p className="text-slate-500 text-sm">
          議案に付与するタグを管理します。「注目順」を設定したタグは公開トップに表示されます。
        </p>
      </header>

      <CreateTagForm />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-slate-200 border-b bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">タグ名</th>
              <th className="px-3 py-2 font-medium">説明</th>
              <th className="w-20 px-3 py-2 text-center font-medium">注目順</th>
              <th className="w-20 px-3 py-2 text-center font-medium">議案数</th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <StatusRow>読み込み中…</StatusRow>
            ) : isError ? (
              <StatusRow className="text-red-600">{error.message}</StatusRow>
            ) : tags.length === 0 ? (
              <StatusRow>
                タグがありません。上のフォームから追加してください。
              </StatusRow>
            ) : (
              tags.map((tag) => <TagRow key={tag.id} tag={tag} />)
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
        colSpan={5}
        className={`px-3 py-8 text-center text-slate-500 ${className ?? ""}`}
      >
        {children}
      </td>
    </tr>
  );
}
