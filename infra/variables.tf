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

# --- 管理画面（apps/admin）と Cloudflare Access ---
# 管理画面は公開サイトと別ホストに置き、そのホスト全体を Access で保護する
# （公開サイト側の /api/* には Access を掛けない）。
# docs/20260801_0758_adminカットオーバー準備.md §2-2, §2-3。
variable "admin_enabled" {
  description = "管理画面のホスト（Routes/DNS）と Access アプリを作るか"
  type        = bool
  default     = false
}

variable "admin_hostname" {
  description = "管理画面のホスト名（例: admin.ota.aix.tokyo）。admin_enabled=true のとき必須"
  type        = string
  default     = ""
}

# 管理者はこの許可リストが唯一の真実（アプリ側に管理者テーブルは持たない）。
# 2026-08-01 決定・カットオーバー準備 §1-1 A。追加・削除はここを変えて apply する。
variable "admin_allowed_emails" {
  description = "管理画面へのアクセスを許可するメールアドレス"
  type        = list(string)
  default     = []
}

variable "admin_allowed_email_domains" {
  description = "管理画面へのアクセスを許可するメールドメイン（例: example.co.jp）。個別メールと併用可"
  type        = list(string)
  default     = []
}

variable "admin_session_duration" {
  description = "Access セッションの有効期間（例: 24h）"
  type        = string
  default     = "24h"
}
