# CLAUDE.md — hr-dx-saas プロジェクト ガイド

> このファイルは Claude Code（および Cursor）がプロジェクトを理解し、一貫した実装を行うための参照ドキュメントです。
> `.agent/rules/basic.md` の設計方針と完全に整合しています。

---

## 1. プロジェクト概要

**HR-DX SaaS** — 日本の人事領域向けマルチテナント SaaS プラットフォーム。

| 項目 | 内容 |
|------|------|
| 目的 | テナント企業の人事 DX（採用・勤怠・ストレスチェック・組織管理等）を一元化 |
| テナント分離 | Supabase RLS による行レベルセキュリティ（物理・論理の両面で完全隔離） |
| ユーザー種別 | 一般従業員 / テナント管理者（人事）/ SaaS 管理者（supaUser） |
| 主要機能 | ストレスチェック・QR 出退勤・AI 採用支援・残業管理・組織診断・パルスサーベイ 等 |

### 技術スタック

| カテゴリ | 採用技術 |
|---------|---------|
| フレームワーク | Next.js 16（App Router）+ React 19 |
| 言語 | TypeScript 5（strict: false） |
| DB / Auth | Supabase（PostgreSQL + RLS + Auth） |
| CSS | Tailwind CSS v4 |
| バリデーション | Zod v4 |
| チャート | Recharts |
| アイコン | lucide-react |
| AI | OpenAI SDK |
| メール | Nodemailer |
| PDF | jsPDF |
| 日時 | date-fns |
| データ取得（CSR） | SWR |

---

## 2. ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 未認証ユーザー向け（login, signup 等）
│   ├── (tenant)/
│   │   ├── (default)/            # ★ 一般従業員向け画面（白基調）
│   │   └── (colored)/adm/        # ★ テナント管理者向け画面（テーマカラー）
│   ├── (admin)/                  # 内部管理
│   ├── (saas-admin)/saas_adm/    # ★ SaaS 運営者向け全体管理画面
│   ├── api/                      # Webhook 等の外部連携のみ（原則 NG）
│   └── p/                        # パブリックページ（認証不要）
│
├── features/                     # ★ 機能ドメイン（ここに実装を集約）
│   └── [domain]/
│       ├── components/           # UI コンポーネント
│       ├── queries.ts            # 読み取り（SELECT）専用
│       ├── actions.ts            # 書き込み（INSERT/UPDATE/DELETE）Server Actions
│       └── types.ts              # ドメイン固有の型
│
├── components/
│   ├── ui/                       # 基礎 UI コンポーネント（Button, Card 等）
│   ├── layout/                   # AppLayout, AppHeader, AppSidebar 等
│   └── common/                   # LoadingSpinner, TenantGuard 等
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # サーバー用クライアント（RLS 有効）
│   │   ├── client.ts             # ブラウザ用クライアント（RLS 有効）
│   │   └── admin.ts              # 管理者用クライアント（RLS バイパス）
│   ├── auth/
│   │   └── server-user.ts        # getServerUser() を定義
│   └── mail/, log/, tenant/, 等
│
├── config/
│   └── routes.ts                 # APP_ROUTES 定数（URL はここから参照）
│
├── types/                        # アプリ全体共通の型定義
├── hooks/                        # useAuth(), useTenant() 等
├── styles/
│   └── globals.css               # Tailwind v4 + CSS 変数
└── middleware.ts                 # Edge Middleware（認証・セッション更新）

supabase/
├── migrations/                   # SQL マイグレーション
└── seed.sql                      # 開発用シードデータ
```

---

## 3. アーキテクチャ原則

### 3-1. データアクセスパターン（厳守）

```
ページ（page.tsx）
  → queries.ts の関数を呼び出す           ← SELECT はここ
  → 結果を Client Component へ Props で渡す

Client Component
  → actions.ts の Server Action を呼び出す ← INSERT/UPDATE/DELETE はここ
```

- `page.tsx` の中に `supabase.from(...)` を直接書かない
- API Route（`app/api/`）は Webhook 等の外部連携を除き作成しない
- `useEffect` + `fetch` によるクライアント側データ取得は避ける

### 3-2. Supabase クライアントの使い分け

| クライアント | インポート元 | 用途 |
|-------------|------------|------|
| `createClient()` | `@/lib/supabase/server` または `client` | 一般ユーザー・管理者用（RLS 有効） |
| `createAdminClient()` | `@/lib/supabase/admin` | SaaS 管理者・バッチ専用（RLS バイパス） |

**`createAdminClient()` はエンドユーザーが触れる `actions.ts` の中では使わない。**

### 3-3. ユーザー情報の取得

```typescript
// サーバー側
import { getServerUser } from '@/lib/auth/server-user'
const user = await getServerUser()

// クライアント側（Context 経由）
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
```

- ユーザーの権限（`app_role`）と所属（`tenant_id`）は `public.employees` テーブルにある
- `auth.users` は認証のみ、アプリ情報は `employees` を参照する

### 3-4. ルーティング

```typescript
// NG: URL のハードコード
router.push('/dashboard')

// OK: 定数を使う
import { APP_ROUTES } from '@/config/routes'
router.push(APP_ROUTES.dashboard)
```

---

## 4. コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `StressCheckForm.tsx` |
| 関数・変数 | camelCase | `getServerUser()` |
| 型・インターフェース | PascalCase | `EmployeeRecord` |
| ファイル名 | kebab-case（コンポーネントは PascalCase） | `score-calculator.ts` |
| DB カラム | snake_case | `tenant_id`, `created_at` |

### TypeScript

- `strict: false`（現状維持。型安全性は開発者判断で向上させる）
- パスエイリアス：`@/*` → `./src/*`
- 型定義は `src/types/` または各ドメインの `types.ts` に集約

### コメント

- **コードコメントは日本語で記述する**
- ビジネスロジック（法令準拠の採点ロジック等）は出典を明記する

### UI / スタイリング

- Tailwind CSS v4 のユーティリティクラスを使用
- カスタムカラー：`primary`（#0055ff）、`accent-teal`（#00c2b8）、`accent-orange`（#ff6b00）
- 日本語フォントは `Noto Serif JP` を使用
- ダークモード対応（CSS 変数でカラー定義）

### UX 標準

- データ取得が発生するルートには `loading.tsx`（スケルトン/Spinner）を配置する
- 同階層に `error.tsx`（再試行ボタン付き）を標準で配置する

### 日時の扱い

- Supabase へ書き込む日時は **`Asia/Tokyo` タイムゾーン** で書き込む

---

## 5. よく使うコマンド

```bash
# 開発サーバー起動（port 3000）
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npm run type-check

# Lint
npm run lint
npm run lint:fix

# フォーマット
npm run format
npm run format:check

# キャッシュクリア
npm run clean
```

### Supabase ローカル開発

```bash
# Supabase 起動（WSL 上でグローバルコマンドを使用）
supabase start

# マイグレーション適用（db reset は使わない）
supabase migration up

# マイグレーション新規作成
supabase migration new <名前>

# DB の型定義を生成
supabase gen types typescript --local > src/lib/supabase/types.ts

# ログ確認
supabase logs
```

**ローカル接続先：**

| 用途 | URL |
|------|-----|
| Supabase Studio | http://127.0.0.1:55423 |
| API | http://127.0.0.1:55421 |
| PostgreSQL | postgresql://127.0.0.1:55422/postgres |

---

## 6. 禁止事項・注意事項

### 絶対禁止

| 禁止操作 | 理由 |
|---------|------|
| `supabase db reset` の実行 | ローカルデータが消滅する。マイグレーションは `migration up` のみで適用する |
| エンドユーザー向け actions.ts で `createAdminClient()` を使用 | RLS バイパスによるテナント横断アクセスのリスク |
| 新規テーブルに RLS ポリシーを設定しない | 他社データ漏洩の直接原因 |
| API Route を無闘に追加（`app/api/`） | 外部連携以外は Server Actions に集約する |
| URL のハードコード | `APP_ROUTES` 定数を必ず使う |

### 注意事項

- `createAdminClient()` を使う場合は、SaaS 管理者（supaUser）専用またはバッチ処理に限定する
- `page.tsx` の中に DB クエリを直接書かない（`queries.ts` に分離する）
- RLS ポリシーは新規テーブル作成時に**必ず**設定する
- `supabase` コマンドは `npx supabase` ではなくグローバルインストール版を使う
- マイグレーション SQL は `supabase db reset` なしで動作するよう設計する

---

## 7. 新機能の実装パターン

### ページ追加の手順

1. **ルーティング確認**：`src/config/routes.ts` に `APP_ROUTES` の定数を追加
2. **ページ配置**：権限に応じたディレクトリへ `page.tsx` を作成
   - 一般従業員 → `src/app/(tenant)/(default)/`
   - テナント管理者 → `src/app/(tenant)/(colored)/adm/`
   - SaaS 管理者 → `src/app/(saas-admin)/saas_adm/`
3. **クエリ実装**：`src/features/[domain]/queries.ts` に SELECT 関数を定義
4. **アクション実装**：`src/features/[domain]/actions.ts` に Server Actions を定義
5. **コンポーネント実装**：`src/features/[domain]/components/` に UI を作成
6. **loading.tsx / error.tsx** を配置

### Server Action のテンプレート

```typescript
'use server';

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'

export async function someAction(input: SomeInput): Promise<Result> {
  // 1. 認証チェック
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Supabase クライアント（RLS 有効）
  const supabase = await createClient()

  // 3. バリデーション（Zod 等）

  // 4. DB 操作
  const { error } = await supabase.from('some_table').insert({ ... })
  if (error) throw error

  // 5. キャッシュ再検証
  revalidatePath('/some-path')
}
```

### マイグレーション SQL のテンプレート

```sql
-- テーブル作成
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 有効化（必須）
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定（必須）
CREATE POLICY "tenant_isolation" ON public.new_table
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );
```

---

## 8. 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL（公開） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（サーバー専用） |
| `DATABASE_URL` | PostgreSQL 直接接続 URL |
| `OPENAI_API_KEY` | OpenAI API キー |
| `SERPAPI_API_KEY` | 求人検索 API キー |

---

## 9. 開発環境

- **OS**: WSL (Ubuntu) 上で開発
- **Node.js**: npm スクリプト経由
- **Supabase**: ローカル Docker コンテナ（`supabase start`）
- **ターミナル**: WSL 上で実行
- **コマンド**: `npx supabase` ではなく、グローバルインストール済みの `supabase` を直接使用
