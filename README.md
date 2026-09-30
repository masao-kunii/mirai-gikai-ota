# みらい議会ー大田区版

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

## アップストリーム
- 本家 mirai-gikai: https://github.com/team-mirai/mirai-gikai
- `git fetch origin && git merge origin/develop` で本家の変更を取り込めます（コンフリクトの解消は必要）

---

# みらい議会

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/team-mirai-volunteer/mirai-gikai)
[![codecov](https://codecov.io/gh/team-mirai/mirai-gikai/branch/develop/graph/badge.svg)](https://codecov.io/gh/team-mirai/mirai-gikai)

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

# サーバー起動
pnpm dev
```

## マイグレーション

```bash
# マイグレーションファイル生成
npx supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

## Adminユーザーの作成

1. Supabase Studio上で Authentication > Add User からユーザーを作成
2. Supabase Studio上で以下のSQLを実行

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
WHERE email = '<1で作成したユーザーのemail>';
```

> [!NOTE]
> 開発環境では、seedデータによって、`email: admin@example.com, password: admin123456` のAdminユーザーが作成されます。
