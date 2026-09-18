---
name: deploy
description: ota/develop の最新を本番（ota.aix.tokyo の Cloudflare Workers と本番 Supabase）へ反映する手順。未適用マイグレーションの確認と適用、必要なデータ投入、api → web の順のデプロイ、デプロイ後の確認までを順に行う。「デプロイして」「本番に反映して」「本番に出して」「リリースして」「マージしたので反映して」「本番で 404 になっている」といった依頼で使う。PR をマージした後に本番へ出すときも使う。
---

# 本番デプロイ

`ota/develop` の最新コミットを本番へ出す。GitHub Actions にデプロイジョブは無く、デプロイは手動の `wrangler deploy` だけで行う。そのため、マージしただけでは本番に反映されない。

## 構成

| 対象 | 実体 | デプロイ方法 |
|---|---|---|
| DB | Supabase `sqjoswnprerzdkhcneni` | `npx supabase db push` |
| api | Worker `mirai-gikai-api`（Hyperdrive 経由で DB へ） | `wrangler deploy`（`apps/api`） |
| web | Worker `mirai-gikai-web`（ルート `ota.aix.tokyo/*`、Service Binding `API` で api を呼ぶ） | Nitro でビルドしてから `wrangler deploy`（`apps/web`） |

新しい web が新しい api を呼び、新しい api が新しいテーブルを読む。このため、反映は必ず **DB → データ → api → web** の順に行う。逆順にすると、途中で 404 や 500 が出る。

## 実行の分担

本番への書き込み（`supabase db push`、データ投入の `--apply`、`wrangler deploy`）は auto mode のガードで止められる。回避しようとしないこと。コマンドを組み立てて、ユーザーに `!` 付きで実行してもらう。

読み取り（差分の確認、dry-run、ビルド、デプロイ後の確認）は自分で実行する。

---

## 0. 準備

### デプロイ用の checkout

作業中のブランチからはデプロイしない。`ota/develop` の先端を detached HEAD で取り出した専用の worktree を使う。

```bash
cd <メインのリポジトリ>
git fetch origin -q
DEPLOY=../mirai-gikai-deploy
if [ -d "$DEPLOY" ]; then
  git -C "$DEPLOY" switch -q --detach origin/ota/develop
else
  git worktree add --detach "$DEPLOY" origin/ota/develop
  cp .env "$DEPLOY/"
fi
cd "$DEPLOY" && pnpm install --frozen-lockfile
git status --porcelain   # 空であること
SHA=$(git rev-parse --short HEAD)
```

### 認証

次の 3 つを確認する。

```bash
(cd apps/api && npx wrangler whoami)            # Cloudflare
gcloud secrets list --project=mirai-gikai-ota   # 本番キーの取得用（Secret Manager）
npx supabase projects list                      # マイグレーション用
```

期限切れならユーザーに再ログインを頼む。`wrangler login` と `gcloud auth login` はブラウザ認証で入力待ちになり、`!` からだとタイムアウトしやすい。**別のターミナルで実行してもらう**よう伝える。

## 1. 何が出るかを把握する

前回デプロイしたコミットは、Worker バージョンのタグ（手順 4 で付ける）に残っている。

```bash
(cd apps/api && npx wrangler versions list --json) | python3 -c "
import json,sys
v=json.load(sys.stdin)[-1]
print(v['id'], v.get('annotations',{}).get('workers/tag'))"
```

タグがあれば、`git log --oneline <前回SHA>..HEAD` で今回出す変更をユーザーに示す。タグが無い場合（この運用より前のデプロイ）は、比較できないとユーザーに伝える。

## 2. DB マイグレーション

```bash
npx supabase link --project-ref sqjoswnprerzdkhcneni   # 初回のみ。パスワード入力は不要
npx supabase migration list --linked                  # remote が空の行が未適用
npx supabase db push --dry-run                        # 流れるファイル名の一覧
```

未適用が無ければ手順 3 へ進む。

未適用がある場合は、流す前に各ファイルの中身を読み、既存データに触る文を洗い出してユーザーに報告する。

```bash
grep -nEi "^\s*(drop|alter table|update|delete|truncate|create policy)" supabase/migrations/<file>.sql
```

特に次を確認する。
- `drop policy` → `create policy`：新しい条件が旧条件を含むか。公開中の議案が見えなくなると、住民から見て障害になる
- `update` / `delete`：対象が、そのマイグレーションで追加した列だけか
- `not null` の追加や型の変更：既存行で失敗しないか

問題が無ければ、ユーザーに `! cd <DEPLOY> && npx supabase db push` を渡す。適用後は `migration list --linked` で未適用が無いこと、追加したテーブルや列が存在することを確認する。

DB の変更は Worker と違ってロールバックできない。ここの確認は省略しない。

## 3. データ投入（必要なときだけ）

新しいテーブルが空のままだと、画面は 200 を返しても中身が空になる（例：`themes` が空だと `/kusei` の一覧が 0 件）。今回追加したマイグレーションが新しいマスタテーブルを作っている場合は、投入の要否をユーザーに確認する。

`pnpm seed` は全テーブルを消してから入れるので、**本番では絶対に使わない**。本番用のスクリプトは `packages/seed/main/*-cloud.ts` にあり、どれも「本番に無い行だけを足す」作りになっている。

```bash
SUPABASE_URL=$(gcloud secrets versions access latest --secret=next-public-supabase-url --project=mirai-gikai-ota) \
SUPABASE_SECRET_KEY=$(gcloud secrets versions access latest --secret=supabase-secret-key --project=mirai-gikai-ota) \
pnpm --filter @mirai-gikai/seed seed:themes-cloud          # dry-run（自分で実行してよい）
```

dry-run の件数をユーザーに見せる。合っていれば、末尾に `--apply` を付けたコマンドを渡す。対応するスクリプトが無ければ、`seed-themes-cloud.ts` と同じ形（既定は dry-run、既存行は更新しない）で作り、別の PR にする。

## 4. ビルドと Worker のデプロイ

### 事前ビルド（自分で実行）

```bash
(cd apps/api && npx wrangler deploy --dry-run --outdir /tmp/api-dry)
NITRO_PRESET=cloudflare_module pnpm --filter public-web build
grep -oE '"(name|pattern)": *"[^"]+"' apps/web/.output/server/wrangler.json
#  → "name": "mirai-gikai-web" と "pattern": "ota.aix.tokyo/*" が出ること
```

web の `NITRO_PRESET=cloudflare_module` は必須。付けないと Node 向けにビルドされる。

### デプロイ（ユーザーが実行）

api → web の順に渡す。`--tag` に SHA を付けて、次回の手順 1 で差分を出せるようにする。

```
! cd <DEPLOY>/apps/api && npx wrangler deploy --tag <SHA> --message "ota/develop <SHA>"
```

api のデプロイが終わったら、web に進む前に `https://mirai-gikai-api.masao-kunii.workers.dev/api/bills` が 200 を返すことを確認する。

```
! cd <DEPLOY>/apps/web && npx wrangler deploy --tag <SHA> --message "ota/develop <SHA>"
```

`pnpm --filter api deploy` とは**書かない**。pnpm 組み込みの `deploy` コマンドが呼ばれて `ERR_PNPM_INVALID_DEPLOY_TARGET` で止まる。スクリプトを使うなら `pnpm --filter api run deploy`。

web は手順 4 のビルド成果物（`.output/`）をそのまま上げる。ビルドした後に checkout を動かした場合は、ビルドからやり直す。

## 5. デプロイ後の確認

```bash
B=https://ota.aix.tokyo
BILL=$(curl -s $B/api/bills | python3 -c "import json,sys;print(json.load(sys.stdin)['bills'][0]['id'])")
for u in / /archive "/bills/$BILL" /kusei /kusei/kosodate /api/bills /api/themes; do
  printf "%-50s " "$u"; curl -s -o /dev/null -w "%{http_code}\n" "$B$u"
done
```

- すべて 200 であること
- 200 でも中身が空のことがある。今回の変更に関わるページは、HTML をテキストにして想定の文言が入っているかを見る（`grep` の長い正規表現は ugrep の制限で失敗するので、python で処理する）
- 余裕があれば E2E スモーク：`E2E_BASE_URL=https://ota.aix.tokyo pnpm --filter public-web test:e2e`

## 6. 報告

ユーザーに次を伝える。
- 出したコミット（SHA と、手順 1 で出した変更の一覧）
- 適用したマイグレーションと投入したデータ
- api と web のバージョン ID（`Current Version ID`）
- 確認結果。確認していないこと（住民側の書き込み系 API など）は、確認していないと明記する

## 切り戻し

Worker は直前のバージョンに戻せる。web を先に戻す。

```
! cd <DEPLOY> && npx wrangler rollback --name mirai-gikai-web -m "<理由>"
! cd <DEPLOY> && npx wrangler rollback --name mirai-gikai-api -m "<理由>"
```

`[version-id]` を省略すると直前のバージョンに戻る。特定のバージョンに戻すときは、手順 1 の `versions list` で ID を調べて渡す。

サイト全体を旧 Cloud Run に戻す場合は、`mirai-gikai-web` の Workers ルート `ota.aix.tokyo/*` を削除する（DNS は変更していないため、削除すると旧環境が応答する）。

適用済みのマイグレーションは自動では戻らない。戻すには逆向きの SQL を書いて新しいマイグレーションにする必要があるので、ユーザーと相談する。

## 対象外

- 管理画面（`apps/admin`、Worker `mirai-gikai-admin`）はまだ本番に出していない。Cloudflare Access の構築（`infra/` の Terraform）と `CF_ACCESS_AUD` / `CF_ACCESS_TEAM_DOMAIN` の設定が先。手順は `docs/20260801_0758_adminカットオーバー準備.md`
- Worker の secrets（`GEMINI_API_KEY` など）の変更は `wrangler secret put` で別途行う。値は表示しない
