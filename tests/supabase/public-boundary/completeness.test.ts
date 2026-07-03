import { afterAll, describe, expect, it } from "vitest";
import { TABLE_BOUNDARIES } from "./classification";
import { createSql } from "./db";

/**
 * 公開境界の網羅性テスト（TARGET_ARCHITECTURE §10.1）。
 *
 * 「新テーブルの分類漏れ」「RLS の付け忘れ」「ポリシーの付け忘れ」
 * 「意図しない GRANT」を機械的に検出する。
 */

const sql = createSql();
afterAll(async () => {
  await sql.end();
});

const tables = Object.keys(TABLE_BOUNDARIES).sort();

describe("公開境界の網羅性", () => {
  it("public スキーマの全テーブルが分類されている（分類漏れ検出）", async () => {
    const rows = await sql`
      select tablename from pg_tables
      where schemaname = 'public'
      order by tablename
    `;
    expect(rows.map((r) => r.tablename)).toEqual(tables);
  });

  it("全テーブルで RLS が有効", async () => {
    const rows = await sql`
      select tablename from pg_tables
      where schemaname = 'public' and not rowsecurity
    `;
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it("分類どおりのポリシーが存在する（付け忘れ検出）", async () => {
    const rows = await sql`
      select tablename, policyname from pg_policies
      where schemaname = 'public'
    `;
    const byTable = new Map<string, string[]>();
    for (const r of rows) {
      const list = byTable.get(r.tablename) ?? [];
      list.push(r.policyname);
      byTable.set(r.tablename, list);
    }

    for (const [table, boundary] of Object.entries(TABLE_BOUNDARIES)) {
      const names = byTable.get(table) ?? [];
      expect(names, `${table}: app_admin_all が必要`).toContain(
        "app_admin_all"
      );
      if (boundary.publicRead === "none") {
        expect(names, `${table}: public_read は不要のはず`).not.toContain(
          "public_read"
        );
      } else {
        expect(names, `${table}: public_read が必要`).toContain("public_read");
      }
      if (boundary.residentWrite) {
        expect(names, `${table}: resident_own が必要`).toContain(
          "resident_own"
        );
      } else {
        expect(names, `${table}: resident_own は不要のはず`).not.toContain(
          "resident_own"
        );
      }
    }
  });

  it("public_reader は公開テーブルの SELECT 以外の権限を持たない", async () => {
    for (const [table, boundary] of Object.entries(TABLE_BOUNDARIES)) {
      const [priv] = await sql`
        select
          has_table_privilege('public_reader', ${`public.${table}`}, 'SELECT')
            or has_any_column_privilege('public_reader', ${`public.${table}`}, 'SELECT')
            as can_select,
          has_table_privilege('public_reader', ${`public.${table}`}, 'INSERT')
            or has_any_column_privilege('public_reader', ${`public.${table}`}, 'INSERT')
            as can_insert,
          has_table_privilege('public_reader', ${`public.${table}`}, 'UPDATE')
            or has_any_column_privilege('public_reader', ${`public.${table}`}, 'UPDATE')
            as can_update,
          has_table_privilege('public_reader', ${`public.${table}`}, 'DELETE')
            as can_delete
      `;
      const expectSelect = boundary.publicRead !== "none";
      expect(priv?.can_select, `${table}: SELECT 権限`).toBe(expectSelect);
      expect(priv?.can_insert, `${table}: INSERT は常に不可`).toBe(false);
      expect(priv?.can_update, `${table}: UPDATE は常に不可`).toBe(false);
      expect(priv?.can_delete, `${table}: DELETE は常に不可`).toBe(false);
    }
  });

  it("resident_writer は住民の声テーブル以外の権限を持たない", async () => {
    for (const [table, boundary] of Object.entries(TABLE_BOUNDARIES)) {
      const [priv] = await sql`
        select
          has_table_privilege('resident_writer', ${`public.${table}`}, 'SELECT')
            or has_any_column_privilege('resident_writer', ${`public.${table}`}, 'SELECT')
            as can_select,
          has_table_privilege('resident_writer', ${`public.${table}`}, 'INSERT')
            or has_any_column_privilege('resident_writer', ${`public.${table}`}, 'INSERT')
            as can_insert
      `;
      if (boundary.residentWrite) {
        expect(priv?.can_select, `${table}: 住民の SELECT`).toBe(true);
        expect(priv?.can_insert, `${table}: 住民の INSERT`).toBe(true);
      } else {
        expect(priv?.can_select, `${table}: 住民の SELECT は不可`).toBe(false);
        expect(priv?.can_insert, `${table}: 住民の INSERT は不可`).toBe(false);
      }
    }
  });

  it("bills の knowledge_source は public_reader から読めない（カラム制限）", async () => {
    const [priv] = await sql`
      select
        has_column_privilege('public_reader', 'public.bills', 'knowledge_source', 'SELECT') as ks,
        has_column_privilege('public_reader', 'public.bills', 'name', 'SELECT') as name
    `;
    expect(priv?.ks).toBe(false);
    expect(priv?.name).toBe(true);
  });
});
