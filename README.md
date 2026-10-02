# みらい議会＠大田区

大田区議会の議案と大田区の区政を、やさしい言葉と AI チャットで住民に届け、
住民の声を匿名で集めて公開するサイトです。

公開先: https://ota.aix.tokyo/

## 注意事項
- このプロジェクトは「チームみらい」が開発・運営している「みらい議会」をForkして開発したものとなります。
- **非公式**プロジェクトです。
- 地方議会版としての基本的なスキーマ・機能調整は[GondoTakashi/mirai-gikai-kawasaki](https://github.com/GondoTakashi/mirai-gikai-kawasaki)を参考にしています。

## 大田区版で変えたこと
- 国会向けの本家に対し、地方議会の議案種別（区長提出議案・議員提出議案・委員会提出議案・報告・請願／陳情）と審議の流れに合わせてデータモデルと画面を作り直し
- 地方自治体の二元代表制に合わせ、区議会だけでなく区政側（[大田区の区政をテーマで知る](https://ota.aix.tokyo/kusei)）も見られるように構成し、議案とテーマを相互に行き来できるようにした
- 大田区議会の定例会ページと本会議録（速報版）の PDF をデータソースとして取り込み、AI で要約・分野別に整理
- 住民の声を AI が対話形式でうかがい、匿名で集約して公開する仕組みを追加（音声入力にも対応）
- ホスティングを Vercel（本家）→ Google Cloud Run → Cloudflare Workers と移行。フルスタック TypeScript（TanStack Start + Hono + Drizzle）の構成に合わせて最終的に Cloudflare を選択

## 構成

| ディレクトリ | 役割 | 本番 |
|---|---|---|
| `apps/web` | 公開サイト（TanStack Start / SSR） | Worker `mirai-gikai-web`（`ota.aix.tokyo`） |
| `apps/api` | API（Hono + Hono RPC） | Worker `mirai-gikai-api`（Hyperdrive 経由で DB） |
| `apps/admin` | 管理画面（Vite + React SPA） | Worker `mirai-gikai-admin`（`ota-admin.aix.tokyo`、Cloudflare Access の背後） |
| `packages/db` | Drizzle のスキーマと接続（公開境界のロール分け） | |
| `packages/shared` | アプリ間で共有するロジック（AI・プロンプト・パース等） | |
| `packages/seed` | 開発用シードと、本番向けの取り込み・運用スクリプト | |
| `supabase/` | マイグレーション | Supabase（素の PostgreSQL として利用） |
| `infra/` | Terraform（Cloudflare Access / Hyperdrive 等） | |

設計の方針と移行計画は [docs/TARGET_ARCHITECTURE.md](docs/TARGET_ARCHITECTURE.md) にあります。

> [!NOTE]
> ルートの `web/` と `admin/` は Cloud Run 時代の旧 Next.js アプリで、撤去予定です。
> 新規の実装は `apps/` 配下に行ってください。

## セットアップ

```bash
# Supabaseの起動
npx supabase start

# 環境変数の設定（必要に応じて.envの内容を変更してください）
cp .env.example .env

# パッケージインストール
pnpm install

# SupabaseのDB初期化, 開発用シードデータのセットアップ
pnpm db:reset

# サーバー起動（公開サイト:3001 / 管理画面:3021 / API:8787、旧アプリも並行起動）
pnpm dev
```

AI 機能（チャット・インタビュー・要約）はローカルでは Vertex AI を使います。
`gcloud auth application-default login` を済ませ、`.env` の `GOOGLE_VERTEX_PROJECT` と
`GOOGLE_VERTEX_LOCATION`（`global`）を設定してください。

## マイグレーション

```bash
# マイグレーションファイル生成
npx supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

## 管理画面

本番の管理画面は Cloudflare Access の背後にあり、許可したアカウントだけが入れます。
API 側は Access が発行する JWT を検証します（`CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD`）。

ローカルでは `.env` に `ADMIN_AUTH_DEV_BYPASS=true` を設定すると認証を通さずに開けます。
**本番では絶対に設定しないでください。**

## デプロイ

GitHub Actions にデプロイジョブはありません。`ota/develop` にマージしたうえで、
`wrangler deploy` を手動で実行します。順番は **DB → api → web** です。

```bash
# DB（未適用のマイグレーションがあるときだけ）
npx supabase db push

# api
cd apps/api && npx wrangler deploy

# web（Cloudflare 向けにビルドしてから）
NITRO_PRESET=cloudflare_module pnpm --filter public-web build
cd apps/web && npx wrangler deploy
```

区議会サイトからの取り込みなど、重い処理は GitHub Actions で動かしています。

| ワークフロー | 内容 |
|---|---|
| `sync_teirei.yml` | 定例会ページから議案・会派見解を取り込み、新しい議案を区政テーマに振り分け（毎日 10:00 JST） |
| `sync_minutes.yml` | 本会議録（速報版）の PDF を取り込み、本文を抽出（毎日 10:30 JST） |
| `publish_session.yml` | 指定した会期の下書き議案をまとめて公開（手動） |
| `ai_cost_check.yml` | 当月の AI 利用コストを確認し、上限超過で失敗させる（毎日） |

> [!NOTE]
> 大田区の公式サイトは Cloudflare からのアクセスを 403 で拒否するため、
> サイトの取得は Worker ではなく GitHub Actions 側で行っています。

## アップストリーム
- 本家 mirai-gikai: https://github.com/team-mirai/mirai-gikai
- `git fetch upstream && git merge upstream/develop` で本家の変更を取り込めます（コンフリクトの解消は必要）
