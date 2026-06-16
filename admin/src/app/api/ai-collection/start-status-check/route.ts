import { NextResponse } from "next/server";

// 地方議会版では Web 検索ベースのステータスチェック (上流の Claude CLI spawn 実装) は
// Cloud Run で動かないため未対応にしている。
export function POST() {
  return NextResponse.json(
    {
      error:
        "Web 検索ベースのステータスチェックは地方議会版では現在対応していません。",
    },
    { status: 503 }
  );
}
