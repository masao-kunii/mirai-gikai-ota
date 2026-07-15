-- ----------------------------------------
-- 区政テーマ（政策領域）のマスタ: themes / theme_contents / theme_initiatives
--
-- 区政を「暮らしのテーマ」でまとめて見せるための公開マスタ。従来 apps/web の
-- 静的定義（lib/kusei-themes.ts）にあった内容を DB 管理に移し、将来「区の計画の
-- AI 要約」を差し込めるようにする（ai_summary 系カラムは今回は空で用意のみ）。
--
--   themes            : テーマ本体（slug/名称/リード文/表示順）
--   theme_contents    : テーマ本文（区の方針・施策・数字・計画リンク。1テーマ1本文）
--   theme_initiatives : 具体的な取り組み（直近の事業。将来インタビュー対象になる）
--
-- 公開境界（TARGET_ARCHITECTURE §3）: いずれも公開マスタ = public_reader が SELECT。
-- 新テーブル追加時の規約に従い、GRANT / RLS ポリシーと
-- tests/supabase/public-boundary/classification.ts の分類宣言をセットで追加する。
-- ----------------------------------------

-- ========== themes ==========
create table themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  emoji text,
  name text not null,
  lead text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_themes_sort_order on themes (sort_order);

create trigger update_themes_updated_at before update on themes
  for each row execute function update_updated_at_column();

alter table themes enable row level security;

grant select on themes to public_reader;
create policy public_read on themes for select to public_reader using (is_active);
create policy app_admin_all on themes for all to app_admin using (true) with check (true);

comment on table themes is '区政テーマ（政策領域）のマスタ。is_active なテーマのみ公開';

-- ========== theme_contents（1テーマ1本文） ==========
create table theme_contents (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null unique references themes (id) on delete cascade,
  overview text,
  policies jsonb not null default '[]'::jsonb,
  numbers jsonb not null default '[]'::jsonb,
  plans jsonb not null default '[]'::jsonb,
  bill_tag_label text,
  ai_summary text,
  ai_summary_source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_theme_contents_updated_at before update on theme_contents
  for each row execute function update_updated_at_column();

alter table theme_contents enable row level security;

grant select on theme_contents to public_reader;
create policy public_read on theme_contents for select to public_reader using (true);
create policy app_admin_all on theme_contents for all to app_admin using (true) with check (true);

comment on table theme_contents is '区政テーマの本文（区の方針・施策・数字・計画リンク）';
comment on column theme_contents.policies is '主な取り組み（政策の柱） {title, body}[]';
comment on column theme_contents.numbers is '数字で見る {label, value, note}[]';
comment on column theme_contents.plans is '出典（区の計画）{name, url}[]';
comment on column theme_contents.bill_tag_label is '関連議案を紐付ける注目タグの label';
comment on column theme_contents.ai_summary is '区の計画PDFのAI要約（将来用。今回は未使用）';

-- ========== theme_initiatives（取り組み。将来インタビュー対象） ==========
create table theme_initiatives (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references themes (id) on delete cascade,
  title text not null,
  body text,
  date_label text,
  url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_theme_initiatives_theme_id on theme_initiatives (theme_id);

create trigger update_theme_initiatives_updated_at before update on theme_initiatives
  for each row execute function update_updated_at_column();

alter table theme_initiatives enable row level security;

grant select on theme_initiatives to public_reader;
create policy public_read on theme_initiatives for select to public_reader using (is_active);
create policy app_admin_all on theme_initiatives for all to app_admin using (true) with check (true);

comment on table theme_initiatives is '区政テーマの具体的な取り組み（直近の事業）。is_active なもののみ公開';
comment on column theme_initiatives.date_label is '実施時期の表示ラベル（例: 令和7年度〜、実施中）';
