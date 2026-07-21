-- 公開意見（interview_report）への住民からの通報。
-- 公開後の安全弁として、不適切・個人情報・事実誤りなどを住民が報告でき、
-- 管理者が確認して必要なら非公開にする。閲覧は管理者のみ（公開しない）。
create table interview_report_flags (
  id uuid primary key default gen_random_uuid(),
  interview_report_id uuid not null
    references interview_report(id) on delete cascade,
  user_id uuid not null,
  reason text not null check (
    reason in ('personal_info', 'inappropriate', 'inaccurate', 'spam', 'other')
  ),
  detail text,
  created_at timestamptz not null default now(),
  -- 同一ユーザーは同一レポートに1回だけ（スパム抑止）
  unique (interview_report_id, user_id)
);

alter table interview_report_flags enable row level security;

create index idx_interview_report_flags_report_id
  on interview_report_flags(interview_report_id);

-- 公開境界（TARGET_ARCHITECTURE §3）:
-- - public_reader: アクセスなし（通報は公開しない）。
-- - resident_writer: 自分の通報のみ insert/select（RLS）。api は withResident で書く。
-- - app_admin: 全権（grant は default privileges で自動付与済み）。閲覧・対応は管理者。
grant select, insert on interview_report_flags to resident_writer;
create policy resident_own on interview_report_flags for all to resident_writer
  using (user_id = nullif(current_setting('app.anon_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.anon_id', true), '')::uuid);

create policy app_admin_all on interview_report_flags for all to app_admin
  using (true) with check (true);

comment on table interview_report_flags is
  '公開意見（interview_report）への住民からの通報。閲覧・対応は管理者のみ';
comment on column interview_report_flags.reason is
  '通報理由: personal_info=個人情報, inappropriate=不適切/攻撃的, inaccurate=事実と異なる, spam=スパム, other=その他';
