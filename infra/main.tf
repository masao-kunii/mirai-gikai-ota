# みらい議会 インフラ定義（Cloudflare）。
# TARGET_ARCHITECTURE §0.5-4 / ADR 0003。
#
# 管理範囲: Hyperdrive（DB 接続プール）と、独自ドメイン移行時の Routes/DNS。
# Worker のスクリプト本体は wrangler deploy が管理する（ビルド成果物のアップロード
# は wrangler が最適なため、二重管理を避けて Terraform 管理外とする）。
# secrets（ANON_COOKIE_SECRET / GEMINI_API_KEY）は wrangler secret で登録し、
# Terraform state には置かない。

terraform {
  required_version = ">= 1.6"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  # state はローカル（infra/*.tfstate、gitignore）。一人運営の先行段階。
  # 複数環境・共同作業が必要になれば R2 バックエンドへ移行する（ADR 0003）。
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# 公開 Postgres（Supabase pooler, session mode）への接続プール。
# api Worker の HYPERDRIVE バインディングにこの id を wrangler.jsonc で設定する。
resource "cloudflare_hyperdrive_config" "db" {
  account_id = var.cloudflare_account_id
  name       = "mirai-gikai-db"
  origin = {
    scheme   = "postgres"
    database = "postgres"
    host     = var.supabase_db_host
    port     = 5432
    user     = var.supabase_db_user
    password = var.supabase_db_password
  }
}

# --- 独自ドメイン移行時のみ（workers.dev 先行では custom_domain_enabled=false で作らない） ---
# 同一ゾーンで /api/* を api Worker、その他を web Worker に振る（ADR 0002 §2）。
resource "cloudflare_workers_route" "api" {
  count   = var.custom_domain_enabled ? 1 : 0
  zone_id = var.zone_id
  pattern = "${var.preview_hostname}/api/*"
  script  = "mirai-gikai-api"
}

resource "cloudflare_workers_route" "web" {
  count   = var.custom_domain_enabled ? 1 : 0
  zone_id = var.zone_id
  pattern = "${var.preview_hostname}/*"
  script  = "mirai-gikai-web"
}

resource "cloudflare_dns_record" "preview" {
  count   = var.custom_domain_enabled ? 1 : 0
  zone_id = var.zone_id
  name    = var.preview_hostname
  type    = "AAAA"
  content = "100::" # Workers ルート用のダミー（プロキシ ON で Worker が応答）
  proxied = true
  ttl     = 1
}

# --- 管理画面（apps/admin）: ホスト全体を Cloudflare Access で保護する ---
# 構成（ADR 0002 §2 と同じ「同一オリジンでパス分割」）:
#   admin.<zone>/api/*  → mirai-gikai-api  （管理 API。requireAdminAccess が効く）
#   admin.<zone>/*      → mirai-gikai-admin（SPA。Workers Static Assets）
# SPA は相対 /api を叩くため、api と同一オリジンに載せる必要がある。
# 公開サイト側の /api/* には Access を掛けない（住民のチャット・インタビューが通らなくなるため）。

resource "cloudflare_dns_record" "admin" {
  count   = var.admin_enabled ? 1 : 0
  zone_id = var.zone_id
  name    = var.admin_hostname
  type    = "AAAA"
  content = "100::" # Workers ルート用のダミー（プロキシ ON で Worker が応答）
  proxied = true
  ttl     = 1
}

resource "cloudflare_workers_route" "admin_api" {
  count   = var.admin_enabled ? 1 : 0
  zone_id = var.zone_id
  pattern = "${var.admin_hostname}/api/*"
  script  = "mirai-gikai-api"
}

resource "cloudflare_workers_route" "admin_spa" {
  count   = var.admin_enabled ? 1 : 0
  zone_id = var.zone_id
  pattern = "${var.admin_hostname}/*"
  script  = "mirai-gikai-admin"
}

# Access アプリ（Self-hosted）。ホスト全体を保護し、通過したリクエストにだけ
# Cf-Access-Jwt-Assertion が付く。api 側 requireAdminAccess はこの JWT を JWKS 検証する。
#
# 管理者の追加・削除は下の include（許可メール / メールドメイン）を変更して apply する。
# これがアプリ内の管理者管理の代わり（2026-08-01 決定・カットオーバー準備 §1-1 A）。
resource "cloudflare_zero_trust_access_application" "admin" {
  count            = var.admin_enabled ? 1 : 0
  account_id       = var.cloudflare_account_id
  name             = "mirai-gikai-admin"
  type             = "self_hosted"
  domain           = var.admin_hostname
  session_duration = var.admin_session_duration

  policies = [{
    id         = cloudflare_zero_trust_access_policy.admin[0].id
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_policy" "admin" {
  count      = var.admin_enabled ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = "mirai-gikai-admin-allow"
  decision   = "allow"

  # 許可メール（個別）と許可ドメインの和集合。どちらか一方でも運用できる。
  include = concat(
    [for email in var.admin_allowed_emails : { email = { email = email } }],
    [for domain in var.admin_allowed_email_domains : { email_domain = { domain = domain } }],
  )
}
