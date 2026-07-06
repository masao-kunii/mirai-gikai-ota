output "hyperdrive_id" {
  description = "api Worker の wrangler.jsonc hyperdrive[0].id に設定する値"
  value       = cloudflare_hyperdrive_config.db.id
}
