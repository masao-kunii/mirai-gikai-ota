/**
 * 区政テーマの「住民の声」集約を画面で確認するためのデモ用シード。
 *
 * 集約表示は公開意見が MIN_PUBLIC_OPINIONS(=10) 件以上で出るゲートがあるため、
 * ローカル/レビュー環境で見た目を確認するには一定数の公開レポートが要る。
 * このスクリプトは対象テーマに、立場（回答者が選ぶ公式ラベル）で分布が
 * 見やすくなるようダミーの公開レポートを投入する。
 *
 * 冪等: 対象テーマの公開 config のセッションを一度すべて削除してから入れ直す
 *       （interview_report / interview_messages は cascade で消える）。
 * 接続: 既定はローカル Supabase（postgresql://postgres:postgres@127.0.0.1:54432）。
 *       別環境に入れるときは SUPABASE_DB_URL を指定する。app_admin ロールで書く。
 *
 * 実行:
 *   pnpm --filter @mirai-gikai/seed run seed:demo-opinions            # 既定テーマ(kosodate)
 *   pnpm --filter @mirai-gikai/seed run seed:demo-opinions bosai      # slug 指定
 *
 * ⚠️ これはローカル/レビュー用のダミーデータであり、本番に投入しないこと。
 */
import { createDbClient, schema, withAppAdmin } from "@mirai-gikai/db";
import { and, eq, sql } from "drizzle-orm";

const { themes, interviewConfigs, interviewSessions, interviewReport } = schema;

const DEFAULT_LOCAL_DB_URL =
  "postgresql://postgres:postgres@127.0.0.1:54432/postgres";

type DemoRow = {
  roleTitle: string;
  role: "daily_life_affected" | "subject_expert" | "general_citizen";
  stance: "for" | "against" | "neutral";
  summary: string;
  richness: number;
};

/** テーマ slug → デモ意見。未定義のテーマは投入対象外（エラーにする）。 */
const DEMO_BY_THEME: Record<string, DemoRow[]> = {
  kosodate: [
    { roleTitle: "子育て中", role: "daily_life_affected", stance: "neutral", summary: "公園や児童館は充実していて助かる一方、放課後の学習支援は家庭差が大きく、区の支援拡充を期待している。", richness: 56 },
    { roleTitle: "子育て中", role: "daily_life_affected", stance: "for", summary: "子ども医療費の助成が手厚く、子どもの通院のハードルが下がってとても助かっている。", richness: 52 },
    { roleTitle: "子育て中", role: "daily_life_affected", stance: "against", summary: "認可保育園に入れず待機児童になっている。病児保育も予約が取りづらく、仕事との両立が大変。", richness: 58 },
    { roleTitle: "子育て中", role: "daily_life_affected", stance: "neutral", summary: "一時預かりの枠が少なく、急な用事のときに頼れる先がない。柔軟に使える預け先を増やしてほしい。", richness: 54 },
    { roleTitle: "子育て予定", role: "daily_life_affected", stance: "neutral", summary: "これから出産予定。産後ケアの費用や利用条件が分かりにくいので、事前に見通せるよう整理してほしい。", richness: 53 },
    { roleTitle: "子育て予定", role: "daily_life_affected", stance: "for", summary: "妊娠・出産の相談窓口が分かりやすく、これから子育てする身として安心できると感じた。", richness: 50 },
    { roleTitle: "子育てに関わる専門家", role: "subject_expert", stance: "neutral", summary: "保育の現場は人手不足が深刻。配置基準の見直しと保育士の処遇改善を計画的に進めてほしい。", richness: 61 },
    { roleTitle: "子育てに関わる専門家", role: "subject_expert", stance: "against", summary: "学童保育の待機が年々増えており、現状の整備ペースでは需要に追いついていないと感じる。", richness: 59 },
    { roleTitle: "大田区在住の未成年", role: "daily_life_affected", stance: "neutral", summary: "中高生が放課後に無料で過ごせる居場所がもっとあるとうれしい。勉強もできる場所が近くにほしい。", richness: 51 },
    { roleTitle: "その他子育てに関心のある区民", role: "general_citizen", stance: "for", summary: "子育て世帯を街ぐるみで支える取り組みは良い。地域で見守る雰囲気がもっと広がってほしい。", richness: 52 },
    { roleTitle: "その他子育てに関心のある区民", role: "general_citizen", stance: "neutral", summary: "子育て支援の情報が各所に分散していて分かりにくい。ワンストップの窓口やアプリでまとめてほしい。", richness: 55 },
    { roleTitle: "その他子育てに関心のある区民", role: "general_citizen", stance: "neutral", summary: "公園の遊具の老朽化が気になる。安全に遊べるよう計画的な更新を進めてほしい。", richness: 50 },
  ],
};

async function main() {
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "kosodate";
  const rows = DEMO_BY_THEME[slug];
  if (!rows) {
    throw new Error(
      `テーマ '${slug}' のデモ意見が未定義です（定義済み: ${Object.keys(DEMO_BY_THEME).join(", ")}）`
    );
  }

  const url = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;
  const db = createDbClient(url);
  console.log(`🌱 デモ意見を投入: テーマ '${slug}'（${rows.length}件） @ ${url}`);

  const inserted = await withAppAdmin(db, async (tx) => {
    const [theme] = await tx
      .select({ id: themes.id })
      .from(themes)
      .where(and(eq(themes.slug, slug), eq(themes.isActive, true)));
    if (!theme) throw new Error(`公開テーマ '${slug}' が見つかりません`);

    // 公開 config を取得（無ければ作る。API の ensureConfig と同じ扱い）。
    const existing = await tx
      .select({ id: interviewConfigs.id })
      .from(interviewConfigs)
      .where(
        and(
          eq(interviewConfigs.themeId, theme.id),
          eq(interviewConfigs.status, "public")
        )
      )
      .limit(1);
    const created = existing[0]
      ? existing
      : await tx
          .insert(interviewConfigs)
          .values({
            themeId: theme.id,
            status: "public",
            name: "住民の声",
            mode: "loop",
          })
          .returning({ id: interviewConfigs.id });
    const cfg = created[0];
    if (!cfg) throw new Error("公開 config の取得/作成に失敗しました");

    // 冪等化: この config の既存セッションを一掃（report/messages も cascade）。
    await tx
      .delete(interviewSessions)
      .where(eq(interviewSessions.interviewConfigId, cfg.id));
    console.log("  既存セッションを削除しました");

    let n = 0;
    for (const row of rows) {
      const [session] = await tx
        .insert(interviewSessions)
        .values({
          interviewConfigId: cfg.id,
          userId: crypto.randomUUID(),
          completedAt: sql`now()`,
        })
        .returning({ id: interviewSessions.id });
      if (!session) throw new Error("セッション作成に失敗しました");
      await tx.insert(interviewReport).values({
        interviewSessionId: session.id,
        summary: row.summary,
        stance: row.stance,
        role: row.role,
        roleTitle: row.roleTitle,
        opinions: [],
        contentRichness: { total: row.richness },
        moderationScore: 8,
        isPublicByUser: true,
        isPublicByAdmin: true,
      });
      n++;
    }
    return n;
  });

  console.log(`✅ 公開レポートを ${inserted} 件投入しました（テーマ '${slug}'）`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
