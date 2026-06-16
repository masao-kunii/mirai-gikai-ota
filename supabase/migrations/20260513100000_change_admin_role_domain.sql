-- ----------------------------------------
-- 自動 admin role 付与のドメインを変更
--
-- upstream の 20260427100000_auto_admin_role_for_google_workspace_users.sql は
-- @team-mir.ai ドメインの Google ログインユーザーに自動で admin role を付与する。
--
-- 大田区版は IAP の OAuth Consent Screen を app.masao-kunii.jp org の Internal で
-- 構成しており、admin にも同じドメイン (@app.masao-kunii.jp) のユーザがアクセスする
-- 想定なので、判定ドメインを書き換える。
-- ----------------------------------------

CREATE OR REPLACE FUNCTION public.apply_admin_role_if_eligible(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_email text;
  user_provider text;
  current_roles jsonb;
BEGIN
  SELECT email, raw_app_meta_data->>'provider', raw_app_meta_data->'roles'
  INTO user_email, user_provider, current_roles
  FROM auth.users WHERE id = target_user_id;

  IF user_email ILIKE '%@app.masao-kunii.jp'
    AND user_provider = 'google'
    AND (current_roles IS NULL OR NOT current_roles @> '["admin"]')
  THEN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{roles}',
      COALESCE(raw_app_meta_data->'roles', '[]'::jsonb) || '["admin"]'::jsonb
    )
    WHERE id = target_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
