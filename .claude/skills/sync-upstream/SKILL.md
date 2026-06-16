---
name: sync-upstream
description: team-mirai/mirai-gikai（upstream）の develop の最新コミットを ota/develop に取り込む手順を実行する。「上流の更新を取り込む」「本家mirai-gikaiの最新を反映」「fork sync」「upstream merge」「team-mirai を merge」「本家を取り込む」「ota/develop を upstream で更新」のようなキーワードが出てきたら必ずこの skill を使うこと。地方議会用のスキーマ変更と Vertex AI/Cloud Run 化が国会版upstreamと衝突するため、機械的な merge では失敗する。このskillは衝突しやすいファイル群とその解決方針までガイドする。
---

# sync-upstream

team-mirai/mirai-gikai（upstream）の `develop` ブランチの最新コミットを、本リポジトリの
`ota/develop` ブランチに取り込むための skill。

mirai-gikai-ota は国会向けの mirai-gikai を地方議会（大田区議会）向けに改造し、さらに
AI provider を Vertex AI Gemini に置換、Cloud Run 用の Dockerfile / standalone build を
追加した派生版。upstream と構造が大きく異なるため、merge は機械的には終わらず、必ず
コンフリクト解消が必要になる。

## このリポジトリの worktree 配置

```
/Users/masao/repos/ota/
├── mirai-gikai/         ← upstream (team-mirai/mirai-gikai) を追跡する worktree。develop ブランチ
└── mirai-gikai-ota/     ← 当リポジトリの worktree。ota/develop ブランチ。.git は共有
```

git remote:
- `origin`   → `git@github.com:masao-kunii/mirai-gikai-ota.git`（自分のfork）
- `upstream` → `https://github.com/team-mirai/mirai-gikai.git`（本家）

## 全体の流れ

1. **事前チェック** — どちらの worktree も working tree がクリーンか、ブランチが正しいかを確認
2. **upstream を最新化** — `mirai-gikai` worktree で `git pull upstream develop`
3. **ota/develop に merge** — `mirai-gikai-ota` worktree で `git merge upstream/develop`
4. **コンフリクト解消** — 後述のファイル分類に従って解消
5. **依存・型・ビルドの再生成** — `pnpm install`, 必要なら `pnpm db:reset`、`pnpm typecheck`、`pnpm test`、`pnpm --filter web build`、`pnpm --filter admin build`
6. **コミット & push** — merge コミットを作成し `git push origin ota/develop`

各ステップごとに状況をユーザーに報告し、コンフリクト解消では必ず差分を確認しながら進める。
独断でファイル全体を `git checkout --ours` / `--theirs` するのは禁止。最低限該当ファイルを
読んで意図を把握すること。

## ステップ詳細

### 1. 事前チェック

```bash
# upstream worktree
git -C /Users/masao/repos/ota/mirai-gikai status -sb
# ota worktree
git -C /Users/masao/repos/ota/mirai-gikai-ota status -sb
```

- 両 worktree とも変更が無いこと（`M` や `??` が無いこと）を確認
- もし変更が残っていれば、ユーザーに stash するか commit するか確認してから進める
- `mirai-gikai-ota` 側のブランチが `ota/develop` であること、`mirai-gikai` 側が `develop` で
  あることを確認

### 2. upstream を最新化

```bash
cd /Users/masao/repos/ota/mirai-gikai
git fetch upstream --prune
git pull --ff-only upstream develop
```

`fast-forward only` で取り込む。ここで衝突や divergence があるのは想定外なので、起こったら
ユーザーに状況を伝えて止まる。

その上で取り込んだコミット数と概要を報告する：

```bash
git log --oneline ORIG_HEAD..HEAD | head -30
git log ORIG_HEAD..HEAD --stat --shortstat | tail -10
```

「N 個のコミットが取り込まれた。主な変更は X, Y, Z」のように一言まとめる。

### 3. ota/develop に merge

```bash
cd /Users/masao/repos/ota/mirai-gikai-ota
git merge upstream/develop --no-ff -m "merge: upstream develop（YYYY-MM-DD取込）"
```

`--no-ff` で必ず merge コミットを作る（後から「いつ取り込んだか」が辿れるように）。
コンフリクトが出たら次のステップへ。

### 4. コンフリクト解消

`git status --short | grep "^UU\|^AA\|^DD\|^AU\|^UA\|^DU\|^UD"` でコンフリクトファイル一覧を取得。
ファイルごとに次の **既知のコンフリクトパターン** に当てはまるか判定する。

#### 4-1. 「常に ours を採用」するファイル群（地方議会用スキーマ・Vertex AI 化の核）

以下のファイル/領域は ota 側で構造的に書き換えているため、upstream の変更があっても
基本的に ours を維持する。upstream の変更内容に新しい意味があるなら別途手で適用する。

- **AI provider 関連**
  - `packages/shared/src/ai/models.ts` — Gemini モデル名にマップ済み
  - `packages/shared/src/ai/get-model.ts`, `sdk.ts` — Vertex AI 用ラッパー
  - `web/src/lib/ai/calculate-ai-cost.ts` — Vertex AI 価格テーブル
  - `web/src/features/chat/server/services/handle-chat-request.ts` — getModel() 利用
  - `admin/src/features/interview-config/shared/utils/chat-model-options.ts` および同 `estimate-interview-cost.ts`
  - 各 callsite が `from "ai"` ではなく `from "@mirai-gikai/shared/ai/sdk"` になっている点を維持

- **地方議会スキーマ**
  - `supabase/migrations/20260216180000_kawasaki_schema_changes.sql` 以降の地方議会用 migration
  - `packages/seed/main/data.ts`, `packages/seed/main/bill-contents-data.ts` — 大田区版 seed
  - `packages/seed/main/run.ts` — `firstFaction = jimin-musho`
  - `packages/supabase/types/supabase.types.ts` — pnpm db:types:gen で再生成するので衝突したら
    自動再生成 (後述)
  - `bill_status_enum` まわり（`adopted`, `partially_adopted`, `submitted`, `in_committee`,
    `plenary_session`, `approved`, `rejected`, `preparing`）
  - `diet_sessions` を参照する upstream 変更 → `council_sessions` に読み替えて適用
  - `originating_house` / `house_enum` を使う upstream 変更 → 一院制なのでカラム参照を削除して適用
  - `mirai_stances` テーブル参照 → ota 側に当該テーブル無し。`faction_stances` で代替

- **大田区固有設定**
  - `web/src/config/site.config.ts`, `admin/src/config/site.config.ts` — 大田区
  - `web/public/manifest.json` — 大田区版
  - `web/package.json`, `admin/package.json` の port 設定（web:3010, admin:3011）

- **Cloud Run 関連**
  - `web/Dockerfile`, `admin/Dockerfile`, `.dockerignore`
  - `cloudbuild.web.yaml`, `cloudbuild.admin.yaml`
  - `web/next.config.ts`, `admin/next.config.ts` の `output: "standalone"` と
    `outputFileTracingRoot`
  - `.env.example` の Vertex AI 環境変数

- **README / FORK_GUIDELINES**
  - 大田区版に書き換えてあるので ours を維持

#### 4-2. 「常に theirs を採用」するファイル群（upstream の改善を素直に取り込む）

以下は upstream の変更を採用する方が望ましい。

- バグ修正コミット由来の変更（コメント等で fix と分かるもの）
- 新機能追加（新しい page.tsx, 新しい api route 等で、地方議会スキーマと衝突しないもの）
- 依存ライブラリの version up（`package.json` の `dependencies` のうち、Vertex AI 化で
  撤去した `@ai-sdk/openai` 系を「復活」させない範囲で取り込む）
- `pnpm-lock.yaml` は基本 theirs。ただし Vertex AI 関連 (`@ai-sdk/google-vertex`,
  `ai@^6`) の解決が崩れていないか確認。崩れていたら `pnpm install` で再生成
- `.coderabbit.yml`, `.github/workflows/` — チームみらい本家のCI改善は取り込む価値あり

#### 4-3. 「手動 merge」が必要なファイル群

両方の変更を統合する必要があるもの。

- **`packages/shared/package.json`** — upstream の依存追加と ota の `@ai-sdk/google-vertex`,
  `ai`, exports（`./ai/get-model`, `./ai/sdk`）を両方残す
- **`web/package.json` / `admin/package.json`** — 同上。`@ai-sdk/openai` は ota で削除済みなので
  upstream が触っていても復活させない
- **新規 admin / web の feature を upstream が追加したケース** — その feature が `diet_sessions`
  を参照していたら `council_sessions` に直す。`originating_house` を使っていたら一院制対応に
  ならす。`AI_MODELS.gpt5_2` 等を直接 streamText に渡していたら `from "@mirai-gikai/shared/ai/sdk"`
  経由にする
- **`supabase/migrations/`** — upstream が新しい migration を追加していたら、内容を読んで
  地方議会スキーマと整合する形で取り込む。`mirai_stances` 操作なら無視、`diet_sessions` 操作なら
  `council_sessions` に書き換え

#### 4-4. 解消の進め方

1. コンフリクトファイルを 1 つずつ読む（`Read`）
2. 上の 4-1 〜 4-3 のどれに該当するか判定
3. 該当する方針で編集
4. `git add <file>` でマーク
5. 全部終わったら `git status -s | grep -v "^M\|^A" | head` でコンフリクトが残っていないことを確認

途中で「これはどう扱うべきか分からない」が出たら、ファイル名と diff の要点をユーザーに報告して
判断を仰ぐ。沈黙して仮判断で進めない。

### 5. 依存・型・ビルドの再生成

merge 後は次の順で確認：

```bash
# 依存解決（lockfile が更新された場合に必要）
pnpm install

# Supabase の型を再生成（migration が増えていれば）
pnpm db:reset            # 開発DBが必要。動いていなければ npx supabase start
# もしくは migration 適用＋型生成だけ
# pnpm db:migrate

# 型チェック
pnpm typecheck

# 単体テスト
pnpm test

# ビルド（standalone 出力を含む）
pnpm --filter web build
pnpm --filter admin build
```

エラーが出たら原因を読んで修正する。代表的な失敗パターン：
- **「Cannot find module 'X'」** — `pnpm install` 後に再リンクされていない場合あり。
  `pnpm install --frozen-lockfile=false` でやり直す
- **TypeScript で `diet_session_id` プロパティが無い** — upstream の新コードが古い名前を使って
  いる。`council_session_id` に変える
- **`bill_status_enum` 値が無い** — upstream が `introduced` などの旧値を使っている。
  `submitted` 等の新値にマップする
- **chat / interview の AI 呼び出しでコンパイルエラー** — `from "ai"` の callsite を
  `from "@mirai-gikai/shared/ai/sdk"` に書き換える

### 6. コミット & push

```bash
# merge コミットは既にあるはず。その上で型再生成等の追加変更があれば amend するか追加コミット
git status -sb
git log -1 --oneline

# 追加変更があれば追加コミット（amend で merge コミットを汚さない）
git add -A
git commit -m "fix: upstream merge後の型再生成とビルド調整"

# push
git push origin ota/develop
```

push 後、GitHub 上で CI が通ることを確認するよう促す（CI 設定があれば `gh pr checks` 等で確認）。

## ユーザーへの報告フォーマット

各ステップ完了時に「✅ ステップN: 〜完了」のように簡潔に報告。コンフリクト解消フェーズに入った
ら、ファイル数と分類別の内訳を最初に伝える：

> upstream/develop を merge しました。コンフリクト 12 ファイル：
> - 自動的に ours で解決可能: 7 ファイル（site.config.ts, models.ts, etc.）
> - 自動的に theirs で解決可能: 3 ファイル（pnpm-lock.yaml, .github/workflows/...）
> - 手動 merge が必要: 2 ファイル（packages/shared/package.json, supabase/migrations/...）
>
> 順番に解消していきます。

最後の push まで完了したら、merge した upstream のコミット数と差分行数、所要時間（体感）、
追加で発生した型/ビルド修正の有無をまとめて報告する。
