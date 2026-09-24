# CLAUDE.md

HR-DX SaaS の常時コンテキストは、この索引だけを読む。詳細はリンク先を必要なときだけ開く。

## プロジェクト

日本の中小企業向け人事 DX マルチテナント SaaS。テナントは Supabase RLS で完全隔離する。

- **2大ゴール**: コミュニケーション促進（パルス・1on1 等）と組織健康度の可視化（ストレス・残業・離職リスク等）
- **権限**: 従業員 `app_role = 'employee'` / テナント管理者 `app_role <> 'employee'` / SaaS管理者 `app_role = 'developer'`
- **画面**: 従業員 `src/app/(tenant)/(tenant-users)/` ・テナント管理者 `src/app/(tenant)/(tenant-admin)/adm/` ・SaaS管理者 `src/app/(saas-admin)/saas_adm/`

**スタック:** Next.js 16 App Router / React 19 / TypeScript（strict: false）/ Supabase / Tailwind v4 / Zod v4  
**本番:** `https://app.hr-dx.jp`（Vercel、リポジトリ `henrywada/hr-dx-saas`）

詳細（権限テーブル、メニュー制御、組織階層）: [docs/agent/project-guide.md](docs/agent/project-guide.md)

## コマンド

```bash
npm run dev            # webpack, port 3000
npm run build
npm run type-check
npm run lint && npm run format
supabase start
supabase migration up  # db reset は使わない
supabase gen types typescript --local > src/lib/supabase/types.ts
```

ローカル: Studio `http://127.0.0.1:55423` / API `55421` / PostgreSQL `55422`  
`supabase` はグローバル版を使う（`npx supabase` 禁止）。

## 実装の型

- SELECT は `src/features/[domain]/queries.ts`、書き込みは同 `actions.ts` の Server Actions
- `page.tsx` に `supabase.from(...)` を直接書かない。`app/api/` は Webhook 等の外部連携のみ
- `createAdminClient()` はエンドユーザー向け `actions.ts` で使わない
- URL は `APP_ROUTES`（`src/config/routes.ts`）。コメントは日本語。日時は `Asia/Tokyo`

ルート構成・ディレクトリ・AppUser・テンプレート: [docs/agent/project-guide.md](docs/agent/project-guide.md) の「アーキテクチャ」「新機能の実装手順」

## UI

管理者カード／テーブル／フォーム: [docs/ui/admin-card-and-table.md](docs/ui/admin-card-and-table.md)

## 絶対禁止・データ保護

- `supabase db reset` / `DROP` / `TRUNCATE` / 範囲無指定の DELETE・UPDATE をしない
- 新規テーブルは RLS 必須。`CREATE TABLE` は `IF NOT EXISTS`
- 破壊的 DDL/DML の前に対象 DB（ローカル `127.0.0.1:55422` か本番か）を宣言し、承認を取る
- 調査は `SELECT` から始める。「作り直す」提案をしない

全文: [docs/agent/project-guide.md](docs/agent/project-guide.md) の「絶対禁止」「データ保護」

## 環境変数

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` / `OPENAI_API_KEY` / `SERPAPI_API_KEY`  
詳細は `.env.example`。
