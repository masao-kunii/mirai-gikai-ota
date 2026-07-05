import { createDbClient, schema, withAppAdmin } from "@mirai-gikai/db";
import { eq } from "drizzle-orm";

/**
 * E2E の前提データを保証する。
 *
 * CI の Supabase は空（マイグレーションのみ）なので、published 議案が
 * 1件も無ければ E2E 用に最小データを app_admin ロールで投入する（冪等）。
 * ローカルは既存の実データがあれば何もしない。
 */
export default async function globalSetup() {
  const db = createDbClient(
    process.env.SUPABASE_DB_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54432/postgres"
  );
  const { bills, billContents, councilSessions } = schema;

  try {
    const existing = await withAppAdmin(db, (tx) =>
      tx
        .select({ id: bills.id })
        .from(bills)
        .where(eq(bills.publishStatus, "published"))
        .limit(1)
    );
    if (existing.length > 0) return;

    await withAppAdmin(db, async (tx) => {
      const [session] = await tx
        .insert(councilSessions)
        .values({
          name: "E2E会期",
          slug: "e2e-session",
          startDate: "2026-01-01",
          endDate: "2026-03-31",
        })
        .returning({ id: councilSessions.id });
      if (!session) throw new Error("E2E 会期の作成に失敗");

      const [bill] = await tx
        .insert(bills)
        .values({
          name: "E2Eテスト議案",
          slug: "e2e-bill",
          billNumber: "第1号議案",
          status: "submitted",
          publishStatus: "published",
          publishedAt: new Date().toISOString(),
          councilSessionId: session.id,
        })
        .returning({ id: bills.id });
      if (!bill) throw new Error("E2E 議案の作成に失敗");

      await tx.insert(billContents).values({
        billId: bill.id,
        difficultyLevel: "normal",
        title: "E2Eやさしいタイトル",
        summary: "E2Eやさしい要約",
        content: "E2Eやさしい本文",
      });
    });
  } finally {
    await db.$client.end();
  }
}
