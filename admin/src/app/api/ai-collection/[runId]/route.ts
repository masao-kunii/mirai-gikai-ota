import { NextResponse } from "next/server";
import { loadRun } from "@/features/ai-collection/server/utils/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    const run = await loadRun(runId);

    if (!run) {
      return NextResponse.json(
        { error: "収集ランが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("AI collection status error:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 上流では Claude CLI を spawn して resume するが、地方議会版では
// Web 検索ベースの収集自体を無効化しているため 503 を返す。
export function POST() {
  return NextResponse.json(
    {
      error:
        "Web 検索ベースの情報収集 (再開) は地方議会版では現在対応していません。",
    },
    { status: 503 }
  );
}
