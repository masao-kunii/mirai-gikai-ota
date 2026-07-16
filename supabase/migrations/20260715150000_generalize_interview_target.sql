-- ----------------------------------------
-- インタビュー対象を「議案専用」から「議案 / テーマ / 取り組み」へ一般化する。
--
-- これまで interview_configs は bill_id 必須（1議案に紐づく）だったが、区政テーマ
-- （themes）やその取り組み（theme_initiatives）に対しても住民の声を集めたい。
-- そこで対象を3種類（bill_id / theme_id / theme_initiative_id）のいずれか1つに
-- 紐づく形へ拡張する。既存の議案インタビューは bill_id のまま動作する。
--
-- 公開境界（public_read）も、対象に応じて「published 議案 / is_active テーマ /
-- is_active 取り組み」のいずれかが公開されているときだけ config を見せるよう拡張する。
-- ----------------------------------------

-- 1. bill_id を任意にし、テーマ／取り組みの対象カラムを追加
alter table interview_configs alter column bill_id drop not null;

alter table interview_configs
  add column theme_id uuid references themes (id) on delete cascade;
alter table interview_configs
  add column theme_initiative_id uuid references theme_initiatives (id) on delete cascade;

-- 対象は3つのうち正確に1つだけ（既存行は bill_id のみ → 通過）
alter table interview_configs
  add constraint chk_interview_target_exactly_one
  check (num_nonnulls(bill_id, theme_id, theme_initiative_id) = 1);

comment on column interview_configs.bill_id is '対象議案ID（対象が議案のとき）';
comment on column interview_configs.theme_id is '対象テーマID（対象が区政テーマのとき）';
comment on column interview_configs.theme_initiative_id is '対象の取り組みID（対象が取り組みのとき）';

-- 2. 検索用インデックスと「対象ごとに公開設定は1つ」の部分ユニーク
--    （bill 版 idx_interview_configs_bill_public に倣う。theme_id/initiative が NULL の
--     行同士は NULL 相異なり扱いで衝突しないため、対象種別ごとに独立して効く）
create index idx_interview_configs_theme_id on interview_configs (theme_id);
create index idx_interview_configs_theme_initiative_id
  on interview_configs (theme_initiative_id);

create unique index idx_interview_configs_theme_public
  on interview_configs (theme_id)
  where status = 'public';
create unique index idx_interview_configs_theme_initiative_public
  on interview_configs (theme_initiative_id)
  where status = 'public';

-- 3. 公開境界の拡張: 対象（議案 / テーマ / 取り組み）が公開されているときだけ見せる
drop policy public_read on interview_configs;
create policy public_read on interview_configs for select to public_reader
  using (
    (
      bill_id is not null
      and exists (
        select 1 from bills b
        where b.id = interview_configs.bill_id
          and b.publish_status = 'published'
      )
    )
    or (
      theme_id is not null
      and exists (
        select 1 from themes t
        where t.id = interview_configs.theme_id and t.is_active
      )
    )
    or (
      theme_initiative_id is not null
      and exists (
        select 1 from theme_initiatives i
        where i.id = interview_configs.theme_initiative_id and i.is_active
      )
    )
  );

-- interview_questions も config 経由で同じ判定に緩める
drop policy public_read on interview_questions;
create policy public_read on interview_questions for select to public_reader
  using (
    exists (
      select 1 from interview_configs c
      where c.id = interview_questions.interview_config_id
        and (
          (
            c.bill_id is not null
            and exists (
              select 1 from bills b
              where b.id = c.bill_id and b.publish_status = 'published'
            )
          )
          or (
            c.theme_id is not null
            and exists (
              select 1 from themes t
              where t.id = c.theme_id and t.is_active
            )
          )
          or (
            c.theme_initiative_id is not null
            and exists (
              select 1 from theme_initiatives ti
              where ti.id = c.theme_initiative_id and ti.is_active
            )
          )
        )
    )
  );
