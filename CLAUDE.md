# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## プロジェクト概要

**HR-DX SaaS** — 日本の人事領域向けマルチテナント SaaS プラットフォーム。テナント企業の人事 DX（採用・勤怠・ストレスチェック・組織管理等）を一元化する。

- テナント分離：Supabase RLS による行レベルセキュリティ（物理・論理の両面で完全隔離）
- ユーザー種別：一般従業員 / テナント管理者（人事）/ SaaS 管理者（supaUser）
- 主要機能：ストレスチェック・QR 出退勤・AI 採用支援・残業管理・組織診断・パルスサーベイ・eラーニング

**技術スタック：** Next.js 16（App Router）+ React 19、TypeScript 5（strict: false）、Supabase（PostgreSQL + RLS + Auth）、Tailwind CSS v4、Zod v4、Recharts、SWR、OpenAI SDK、date-fns

---

## コマンド

```bash
# 開発サーバー起動（port 3000）— webpack モードで起動
npm run dev

# プロダクションビルド（webpack モード）
npm run build

# 型チェック
npm run type-check

# Lint / フォーマット
npm run lint
npm run lint:fix
npm run format
npm run format:check

# キャッシュクリア
npm run clean
```

### Supabase ローカル開発

```bash
supabase start                                           # 起動（グローバルコマンドを使用）
supabase migration up                                    # マイグレーション適用（db reset は使わない）
supabase migration new <名前>                            # マイグレーション新規作成
supabase gen types typescript --local > src/lib/supabase/types.ts
npm run supabase:migration-repair                        # 壊れたマイグレーション履歴の修復
npm run recalculate-stress-results                       # ストレス結果の再計算（tsx スクリプト）
```

**ローカル接続先：** Studio `http://127.0.0.1:55423` / API `http://127.0.0.1:55421` / PostgreSQL `postgresql://127.0.0.1:55422/postgres`

**Auth の注意：** `auth.users` はローカル Docker とホスト Supabase で別DB。シードは `seed.sql` → `seed_auth.sql` の順で実行される。SaaS 管理者は `saas-admin@example.test` として作成される。

---

## アーキテクチャ

### ルートグループ構造

`src/app/(tenant)/` 配下のルートグループは権限とレイアウトを分離する：

```
(auth)/                    # 未認証ユーザー向け（login, signup 等）
(tenant)/
  (default)/               # 一般従業員向け（白基調）
  (colored)/adm/           # テナント管理者向け（テーマカラー）
    (ai_agent)/            # AI 系機能（ai-workplace-improvement 等）
    (base_mnt)/            # 基本設定
    (company_doctor)/      # 産業医向け
    (csv_atendance)/       # CSV 出退勤
    (el)/                  # eラーニング
    (manual)/              # マニュアル
    (org_health)/          # 組織健康（ストレスチェック・high-stress 等）
    (overtime)/            # 残業管理
    (pc_atendance)/        # テレワーク勤怠
    (puls)/                # パルスサーベイ
    (qr_atendance)/        # QR 出退勤
    (questionnaire)/       # アンケート
    (recurit)/             # 採用
(saas-admin)/saas_adm/     # SaaS 運営者向け全体管理
(admin)/                   # 内部管理
p/                         # パブリックページ（認証不要）
```

### データアクセスパターン（厳守）

```
page.tsx（Server Component）
  → src/features/[domain]/queries.ts   # SELECT のみ
  → 結果を Client Component に Props で渡す

Client Component
  → src/features/[domain]/actions.ts  # INSERT / UPDATE / DELETE（Server Actions）
```

- `page.tsx` の中に `supabase.from(...)` を直接書かない
- `app/api/` は Webhook 等の外部連携のみ（Server Actions を使う）
- `useEffect` + `fetch` によるクライアント側データ取得は避ける
- OpenAI API 等の外部 API は必ず Server Actions 内で実行する（秘密鍵をブラウザに露出させない）

### Supabase クライアントの使い分け

| クライアント | インポート元 | 用途 |
|-------------|------------|------|
| `createClient()` | `@/lib/supabase/server` または `client` | 一般ユーザー・管理者用（RLS 有効） |
| `createAdminClient()` | `@/lib/supabase/admin` | SaaS 管理者・バッチ専用（RLS バイパス） |

**`createAdminClient()` はエンドユーザーが触れる `actions.ts` の中では絶対に使わない。**

### ユーザー情報（AppUser 型）

`getServerUser()`（`@/lib/auth/server-user`）は `employees` + `app_role` + `tenants` を JOIN して `AppUser` を返す：

| フィールド | 内容 |
|-----------|------|
| `id` | auth.users の UUID |
| `appRole` | `app_role.app_role`（権限コード）|
| `tenant_id` | テナント ID |
| `planType` | `'free' \| 'pro' \| 'enterprise'` |
| `employee_id` | `employees.id` |
| `division_id` | 所属部署 ID（未配属は null）|
| `is_manager` | 上長・承認者フラグ |

クライアント側は `useAuth()` / `useTenant()` フック経由で参照する。

### ミドルウェア（`src/middleware.ts`）

Edge Runtime で動作。全 GET リクエストで `access_logs` に PAGE_VIEW を記録。未認証ユーザーを `/login` にリダイレクト。認証済みユーザーがログインページにアクセスすると `/top` にリダイレクト。

### Server Actions の制限

`next.config.ts` の設定値：
- `serverActions.bodySizeLimit: "50mb"`（ファイルアップロード対応）
- `allowedOrigins`: `https://app.hr-dx.jp`, Vercel URL, `http://localhost:3000`

---

## コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `StressCheckForm.tsx` |
| 関数・変数 | camelCase | `getServerUser()` |
| 型・インターフェース | PascalCase | `EmployeeRecord` |
| ファイル名 | kebab-case（コンポーネントは PascalCase） | `score-calculator.ts` |
| DB カラム | snake_case | `tenant_id`, `created_at` |

- TypeScript `strict: false`（現状維持）
- パスエイリアス：`@/*` → `./src/*`
- **コードコメントは日本語で記述する**
- ビジネスロジック（法令準拠の採点ロジック等）は出典を明記する
- Tailwind CSS v4 を使用。カスタムカラー：`primary`（#0055ff）、`accent-teal`（#00c2b8）、`accent-orange`（#ff6b00）
- 日本語フォントは `Noto Serif JP`
- Supabase への日時書き込みは `Asia/Tokyo` タイムゾーンで行う
- データ取得が発生するルートには `loading.tsx` と `error.tsx` を配置する

### ルーティング

```typescript
// NG
router.push('/dashboard')
// OK
import { APP_ROUTES } from '@/config/routes'
router.push(APP_ROUTES.dashboard)
```

---

## 新機能の実装手順

1. `src/config/routes.ts` に `APP_ROUTES` 定数を追加
2. 権限に応じたディレクトリへ `page.tsx` を作成
3. `src/features/[domain]/queries.ts` に SELECT 関数を定義
4. `src/features/[domain]/actions.ts` に Server Actions を定義
5. `src/features/[domain]/components/` に UI を作成
6. `loading.tsx` / `error.tsx` を配置

### Server Action テンプレート

```typescript
'use server';

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'

export async function someAction(input: SomeInput): Promise<Result> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { error } = await supabase.from('some_table').insert({ ... })
  if (error) throw error

  revalidatePath('/some-path')
}
```

### マイグレーション SQL テンプレート

```sql
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.new_table
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );
```

---

## 絶対禁止

| 禁止操作 | 理由 |
|---------|------|
| `supabase db reset` の実行 | ローカルデータが消滅する |
| エンドユーザー向け `actions.ts` で `createAdminClient()` を使用 | RLS バイパスによるテナント横断アクセスのリスク |
| 新規テーブルに RLS ポリシーを設定しない | 他社データ漏洩の直接原因 |
| `app/api/` に不要な API Route を追加 | 外部連携以外は Server Actions に集約する |
| URL のハードコード | `APP_ROUTES` 定数を使う |
| `npx supabase` の使用 | グローバルインストール版の `supabase` を使う |

---

## 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL（公開） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（サーバー専用） |
| `DATABASE_URL` | PostgreSQL 直接接続 URL |
| `OPENAI_API_KEY` | OpenAI API キー |
| `SERPAPI_API_KEY` | 求人検索 API キー |

詳細は `.env.example` を参照。
