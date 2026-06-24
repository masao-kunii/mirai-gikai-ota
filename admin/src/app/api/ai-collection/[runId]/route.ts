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
