output "hyperdrive_id" {
  description = "api Worker の wrangler.jsonc hyperdrive[0].id に設定する値"
  value       = cloudflare_hyperdrive_config.db.id
}

# api Worker の CF_ACCESS_AUD に設定する値（apply 後に取得する）。
#   terraform output -raw admin_access_aud | npx wrangler secret put CF_ACCESS_AUD
# CF_ACCESS_TEAM_DOMAIN は Zero Trust のチームドメイン（https://<team>.cloudflareaccess.com）。
# これは Access アプリの属性ではないため、ダッシュボードで確認して wrangler secret put する。
output "admin_access_aud" {
  description = "管理画面 Access アプリの Application Audience (AUD) タグ"
  value       = var.admin_enabled ? cloudflare_zero_trust_access_application.admin[0].aud : ""
}
