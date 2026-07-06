variable "cloudflare_api_token" {
  description = "Cloudflare API トークン（env: TF_VAR_cloudflare_api_token 推奨）"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare アカウント ID"
  type        = string
}

variable "supabase_db_host" {
  description = "Supabase pooler ホスト（例: aws-0-<region>.pooler.supabase.com）"
  type        = string
}

variable "supabase_db_user" {
  description = "Supabase pooler ユーザー（例: postgres.<project-ref>）"
  type        = string
}

variable "supabase_db_password" {
  description = "Supabase DB パスワード"
  type        = string
  sensitive   = true
}

# --- 独自ドメイン移行用（workers.dev 先行では false のまま） ---
variable "custom_domain_enabled" {
  description = "独自ドメインで Routes/DNS を作るか。workers.dev 先行では false"
  type        = bool
  default     = false
}

variable "zone_id" {
  description = "独自ドメインのゾーン ID（custom_domain_enabled=true のとき必須）"
  type        = string
  default     = ""
}

variable "preview_hostname" {
  description = "プレビューのホスト名（例: preview.example.jp）"
  type        = string
  default     = ""
}
