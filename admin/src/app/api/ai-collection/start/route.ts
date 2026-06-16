import { NextResponse } from "next/server";

// 地方議会版では Web 検索ベースの収集 (上流の Claude CLI spawn 実装) は
// Cloud Run で動かないため未対応にしている。議事録 PDF からの抽出は
// /api/ai-collection/start-from-minutes を使う。
export function POST() {
  return NextResponse.json(
    {
      error:
        "Web 検索ベースの情報収集は地方議会版では現在対応していません。議事録 PDF からの抽出をご利用ください。",
    },
    { status: 503 }
  );
}
