import { zValidator } from "@hono/zod-validator";
import { schema } from "@mirai-gikai/db";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import {
  extractFromMinutes,
  type FactionRecord,
  findFactionByName,
} from "../../lib/bills/extract-from-minutes";
import { importTeireiBills } from "../../lib/bills/import-teirei";
import { adminQuery } from "../../lib/db";

const {
  bills,
  councilSessionMinutes,
  councilSessions,
  factions,
  factionStances,
} = schema;

/**
 * 管理 議事録からの議案抽出（app_admin ロール）— ai-collection の残りを移植。
 *
 * 旧実装はローカルファイルに収集ラン（ドラフト）を保存していたが、Workers では
 * ファイルシステムを持てないため**ステートレスな2段**に置き換える:
 *   1. POST /extract : 選んだ議事録を LLM で解析し、議案候補＋会派見解を返す（保存しない）
 *   2. POST /import  : 画面でレビューして選んだ候補を、draft 議案として作成する
 *
 * 取り込みは常に publish_status='draft' で作る（公開は議案画面で人が判断する）。
 * 会派見解は会派名が完全一致した分のみ付ける（不一致は warning で返す）。
 */

const statusEnum = z.enum([
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
]);
// DB の stance_type_enum に無い absent は取り込み時に落とす。
const importableStance = z.enum(["for", "against", "neutral"]);

const extractBodySchema = z.object({
  minuteIds: z.array(z.uuid()).min(1).max(10),
});

const importBodySchema = z.object({
  councilSessionId: z.uuid().nullable().optional(),
  bills: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(500),
        billNumber: z.string().trim().max(100).nullable().optional(),
        summary: z.string().max(5000).nullable().optional(),
        status: statusEnum,
        stances: z
          .array(
            z.object({
              factionName: z.string().trim().min(1),
              stanceType: importableStance,
              comment: z.string().max(2000).nullable().optional(),
            })
          )
          .max(30)
          .default([]),
      })
    )
    .min(1)
    .max(50),
});

export const adminBillsExtractRoute = new Hono()
  // 議事録から議案候補を抽出（保存しない）
  .post("/extract", zValidator("json", extractBodySchema), async (c) => {
    const { minuteIds } = c.req.valid("json");
    const minutes = await adminQuery((tx) =>
      tx
        .select({
          title: councilSessionMinutes.title,
          meetingDate: councilSessionMinutes.meetingDate,
          markdownText: councilSessionMinutes.markdownText,
        })
        .from(councilSessionMinutes)
        .where(
          and(
            inArray(councilSessionMinutes.id, minuteIds),
            isNotNull(councilSessionMinutes.markdownText),
            ne(councilSessionMinutes.markdownText, "")
          )
        )
    );
    if (minutes.length === 0) {
      return c.json({ error: "no_minutes_with_text" }, 400);
    }
    try {
      const result = await extractFromMinutes(
        minutes.map((m) => ({
          title: m.title,
          meetingDate: m.meetingDate,
          markdownText: m.markdownText ?? "",
        }))
      );
      // 既存議案との重複候補を示す（同名があれば画面で気づけるように）。
      const existing = await adminQuery((tx) =>
        tx.select({ id: bills.id, name: bills.name }).from(bills)
      );
      const existingNames = new Set(existing.map((b) => b.name));
      const extracted = result.bills.map((b) => ({
        ...b,
        alreadyExists: existingNames.has(b.title),
        stances: result.factionStances
          .filter((s) => s.billTitle === b.title)
          .map((s) => ({
            factionName: s.factionName,
            stanceType: s.stanceType,
            comment: s.comment,
          })),
      }));
      return c.json({ bills: extracted, minutesUsed: minutes.length });
    } catch (e) {
      console.error("extract-from-minutes failed:", e);
      return c.json({ error: "extraction_failed" }, 502);
    }
  })
  // 選ばれた候補を draft 議案として取り込む
  .post("/import", zValidator("json", importBodySchema), async (c) => {
    const body = c.req.valid("json");
    const result = await adminQuery(async (tx) => {
      const factionRows = await tx
        .select({
          id: factions.id,
          displayName: factions.displayName,
          alternativeNames: factions.alternativeNames,
        })
        .from(factions);
      const factionList: FactionRecord[] = factionRows.map((f) => ({
        id: f.id,
        displayName: f.displayName,
        alternativeNames: f.alternativeNames ?? [],
      }));

      const warnings: string[] = [];
      let createdCount = 0;
      let stanceCount = 0;

      for (const draft of body.bills) {
        const [created] = await tx
          .insert(bills)
          .values({
            name: draft.title,
            billNumber: draft.billNumber ?? "",
            status: draft.status,
            // 取り込みは常に下書き。公開は議案画面で人が判断する。
            publishStatus: "draft",
            statusNote: draft.summary ?? null,
            councilSessionId: body.councilSessionId ?? null,
          })
          .returning({ id: bills.id });
        if (!created) continue;
        createdCount += 1;

        // 同一会派の重複は先勝ち（faction_stances は (bill,faction) 一意）。
        const seenFactions = new Set<string>();
        for (const st of draft.stances) {
          const faction = findFactionByName(factionList, st.factionName);
          if (!faction) {
            warnings.push(
              `会派「${st.factionName}」が見つからないため見解を取り込めませんでした（${draft.title}）`
            );
            continue;
          }
          if (seenFactions.has(faction.id)) continue;
          seenFactions.add(faction.id);
          await tx.insert(factionStances).values({
            billId: created.id,
            factionId: faction.id,
            type: st.stanceType,
            comment: st.comment ?? null,
          });
          stanceCount += 1;
        }
      }
      return { createdCount, stanceCount, warnings };
    });

    return c.json(result);
  })
  // 定例会ページ（大田区議会サイト）から議案を一括取り込み
  .post(
    "/import-teirei",
    zValidator(
      "json",
      z.object({
        indexUrl: z.url().max(2000),
        councilSessionId: z.uuid(),
      })
    ),
    async (c) => {
      const { indexUrl, councilSessionId } = c.req.valid("json");
      // 会期名は bill_contents の本文に載せるため先に引く。
      const [session] = await adminQuery((tx) =>
        tx
          .select({ id: councilSessions.id, name: councilSessions.name })
          .from(councilSessions)
          .where(eq(councilSessions.id, councilSessionId))
      );
      if (!session) return c.json({ error: "not_found" }, 404);

      const fetchText = async (url: string): Promise<string> => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        return res.text();
      };

      try {
        const result = await adminQuery((tx) =>
          importTeireiBills(tx, fetchText, {
            indexUrl,
            councilSessionId,
            sessionName: session.name,
          })
        );
        if (!result.ok) {
          return c.json({ error: "import_failed", detail: result.error }, 502);
        }
        return c.json({
          billsUpserted: result.billsUpserted,
          stancesUpserted: result.stancesUpserted,
          warnings: result.warnings,
        });
      } catch (e) {
        console.error("import-teirei failed:", e);
        return c.json({ error: "import_failed" }, 502);
      }
    }
  );

export type AdminBillsExtractRouteType = typeof adminBillsExtractRoute;
