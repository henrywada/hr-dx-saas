# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## プロジェクト概要

**HR-DX SaaS** — 日本の人事領域向けマルチテナント SaaS プラットフォーム。テナント企業の人事 DX（採用・勤怠・ストレスチェック・組織管理等）を一元化する。

- テナント分離：Supabase RLS による行レベルセキュリティ（物理・論理の両面で完全隔離）
- ユーザー種別：一般従業員 / テナント管理者（人事）/ SaaS 管理者（権限モデルの詳細は下記「基本要件」参照）
- 主要機能：ストレスチェック・QR 出退勤・AI 採用支援・残業管理・組織診断・パルスサーベイ・eラーニング

---

## 基本要件（プロダクトビジョン・権限モデル）

### 目標

1. IT部門に余裕のない中小企業へSaaSを販売し、組織の活性化を支援する
2. 「人を大切に、コミュニケーションを大切に、従業員の能力を活かす組織形成」を重視したシステムとする

### プロダクトの2大ゴール

機能の取捨選択・優先順位付けの判断基準となる、プロダクトの中核ゴール：

1. **コミュニケーションを大切にするシステム** — パルスサーベイ・1on1・アンケート等、従業員間・上長間のコミュニケーションを促進・可視化する機能を優先する
2. **組織健康度の可視化** — ストレスチェック・組織診断・残業管理・離職リスク等のデータを統合し、組織の健康状態を経営者・人事責任者が把握できるようにする

新機能の企画・実装判断に迷った場合は、この2大ゴールへの貢献度を基準に優先順位を決める。

### ペルソナ

日本の中小企業（従業員50〜1000名）の経営者・人事責任者

### 権限モデル（app_role テーブル）

`app_role` は「テナントユーザの権限・役割」と「役割ごとに有効な機能（services）」を定義するマスタテーブル。`employees.app_role_id` で各従業員に割り当てる。

| 区分 | 判定条件 | 説明 |
| --- | --- | --- |
| テナントユーザ（従業員） | `app_role.app_role = 'employee'` | テナント内の一般アクセス権限のみ。管理操作不可 |
| テナント管理者 | `app_role.app_role <> 'employee'` | テナント内データの管理権限。`app_role.app_role` の値ごとに有効な機能が異なる（役割区分） |
| SaaS管理者 | `app_role.app_role = 'developer'` | 全テナントデータへのアクセス可（テナント作成等の運用業務）。コード上は `user.role === 'supaUser'`（レガシーの user_metadata 判定）とのOR条件で許可している箇所がある（`src/app/(saas-admin)/layout.tsx`）。新規実装では `appRole === 'developer'` を優先して判定する |

コンポーネント配置（権限別、下記「ルートグループ構造」と対応）：
- テナントユーザ → `src/app/(tenant)/(tenant-users)/`
- テナント管理者 → `src/app/(tenant)/(tenant-admin)/adm/`
- SaaS管理者 → `src/app/(saas-admin)/saas_adm/`

### 組織階層（divisions）

`divisions` テーブルで `layer`（階層番号、Top階層は `1`）と `parent_id`（親組織ID、Top階層は `NULL`）により組織ツリーを定義する。従業員の所属組織は `employees.division_id` で参照する（未配属は `null`）。

### メニュー構成とサービス機能制御

メニュー画面は「サイドメニュー（大分類）」＋「サービス機能メニュー（カードボタン一覧）」の2階層で構成される。

| テーブル | 役割 |
| --- | --- |
| `service_class` | `service_category` を分類する大分類 |
| `service_category` | サイドメニュー表示用のサービス機能分類キー |
| `services` | サービス機能の定義（遷移先URL等） |
| `tenant_service` | テナント単位で有効な機能を定義 |
| `app_role_service` | 役割（`app_role`）単位で有効な機能を定義 |

管理画面メニューは `tenant_service` と `app_role_service` の **両方** の条件でフィルタする（テナント未契約の機能、または役割に許可されていない機能は表示しない）。

---

**技術スタック：** Next.js 16（App Router）+ React 19、TypeScript 5（strict: false）、Supabase（PostgreSQL + RLS + Auth）、Tailwind CSS v4、Zod v4、Recharts、SWR、OpenAI SDK、date-fns

**ソース管理 / インフラ：**

- **GitHub**：リポジトリ `henrywada/hr-dx-saas`（ソース管理）。`.github/workflows/` は未配置のため GitHub Actions CI/CD は設定なし（ビルド・デプロイは Vercel の Git 連携に委譲）
- **Vercel**：本番ホスティング / デプロイ。本番カスタムドメイン `https://app.hr-dx.jp`。GitHub へのプッシュをトリガーに自動ビルド・デプロイ（webpack モード）。Server Actions の `allowedOrigins` で本番ドメイン・Vercel ホスト（`VERCEL_URL`）・ローカルの Origin を許可（`next.config.ts` 参照）

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
  (tenant-users)/          # 一般従業員向け（白基調）
  (tenant-admin)/adm/      # テナント管理者向け（テーマカラー）
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

### src/ ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 未認証ユーザー向け（login, signup 等）
│   ├── (tenant)/
│   │   ├── (tenant-users)/       # ★ 一般従業員向け画面（白基調）
│   │   └── (tenant-admin)/adm/   # ★ テナント管理者向け画面（テーマカラー）
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
│   │   └── admin.ts             # 管理者用クライアント（RLS バイパス）
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

| クライアント          | インポート元                            | 用途                                    |
| --------------------- | --------------------------------------- | --------------------------------------- |
| `createClient()`      | `@/lib/supabase/server` または `client` | 一般ユーザー・管理者用（RLS 有効）      |
| `createAdminClient()` | `@/lib/supabase/admin`                  | SaaS 管理者・バッチ専用（RLS バイパス） |

**`createAdminClient()` はエンドユーザーが触れる `actions.ts` の中では絶対に使わない。**

### ユーザー情報（AppUser 型）

`getServerUser()`（`@/lib/auth/server-user`）は `employees` + `app_role` + `tenants` を JOIN して `AppUser` を返す：

| フィールド    | 内容                              |
| ------------- | --------------------------------- |
| `id`          | auth.users の UUID                |
| `appRole`     | `app_role.app_role`（権限コード） |
| `tenant_id`   | テナント ID                       |
| `planType`    | `'free' \| 'pro' \| 'enterprise'` |
| `employee_id` | `employees.id`                    |
| `division_id` | 所属部署 ID（未配属は null）      |
| `is_manager`  | 上長・承認者フラグ                |

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

| 対象                 | 規則                                      | 例                        |
| -------------------- | ----------------------------------------- | ------------------------- |
| コンポーネント       | PascalCase                                | `StressCheckForm.tsx`     |
| 関数・変数           | camelCase                                 | `getServerUser()`         |
| 型・インターフェース | PascalCase                                | `EmployeeRecord`          |
| ファイル名           | kebab-case（コンポーネントは PascalCase） | `score-calculator.ts`     |
| DB カラム            | snake_case                                | `tenant_id`, `created_at` |

- TypeScript `strict: false`（現状維持）
- パスエイリアス：`@/*` → `./src/*`
- **コードコメントは日本語で記述する**
- ビジネスロジック（法令準拠の採点ロジック等）は出典を明記する
- デザイントークンは HR-DX Design System（styles.css + tokens/）を優先する。ブランドカラー #FD7601（オレンジ）+ クールグレー系。Tailwind はユーティリティ補助として使用する。
- 日本語フォントは Noto Sans JP（本文・ラベル）/ Noto Sans Mono（ID・数値）。Noto Serif JP は使用しない。
- カラー・スペーシング・ボーダー等は tokens/ の CSS 変数（--brand, --text-secondary 等）を参照する。
- Supabase への日時書き込みは `Asia/Tokyo` タイムゾーンで行う
- データ取得が発生するルートには `loading.tsx` と `error.tsx` を配置する

### UI — 管理者向けカード／一覧テーブル（共通）

デザインは HR-DX Design System に準拠する。components/ の Card・DataTable・Badge・StatusIndicator 等を使用する。styles.css をリンクし、tokens/ の CSS 変数でスタイリングする。

#### メイン領域パディング標準（AWS 2 パターン）

AppLayout のメインコンテンツエリアは、ページの用途に応じて 2 パターンから選択：

**パターン A: コンテンツ幅制限型（SES ダッシュボール風）**

最大幅を制限してコンテンツを中央に配置。情報系ダッシュボード・詳細画面向け。

| 画面サイズ | パディング | 説明 |
| --------- | --------- | ---- |
| 小〜中     | `px-4`    | モバイル・タブレット |
| 大以上    | `px-6`    | デスクトップ         |

```tsx
<div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
  {children}
</div>
```

**用途：** ストレスチェック結果、詳細情報、レポート、ダッシュボード

---

**パターン B: フル幅型（EC2 コンソール風）**

画面幅をフルに使ってデータ表示。テーブル・リスト・グリッド向け。

| 画面サイズ | パディング | 説明 |
| --------- | --------- | ---- |
| 小〜中     | `px-4`    | モバイル・タブレット |
| 大        | `px-6`    | デスクトップ         |
| 超大      | `px-8`    | 1024px 以上         |

```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
  {children}
</div>
```

**用途：** テーブル、従業員管理、e-learning 管理、データリスト

---

**選択ガイド：**

| 特徴 | パターン A（制限型） | パターン B（フル幅型） |
| --- | --------------- | ------------------- |
| コンテンツ中央配置 | ✓ | |
| 左右余白が大きい | ✓ | |
| データ表示に最適 | | ✓ |
| テーブル・リスト | | ✓ |
| 読みやすさ重視 | ✓ | |
| 情報密度重視 | | ✓ |

#### カード間隔標準（AWS 風シャープ設計）

ダッシュボール（/top）のカード間隔をデフォルト化。AWS コンソール風のシャープで精密な情報密度を実現。

| 項目 | 値 | 説明 |
|------|-----|------|
| **セクション間隔** | `space-y-4` | セクション（タスク、情報）間の上下マージン（16px） |
| **カード横間隔** | `gap-3` | 2 列グリッド内のカード間隔（12px） |
| **コンテナパディング上下** | `py-5` | メインコンテナの上下パディング（20px） |
| **コンテナパディング左右** | `px-4 sm:px-6` | レスポンシブ左右パディング |
| **カード内パディング** | `p-5` | カード内コンテンツパディング（20px） |
| **ボーダーラウンド** | `rounded-lg` | カードコーナー丸み（8px） |
| **シャドウ** | `shadow-xs` | 微細な影 |
| **max-width** | `max-w-[1200px]` | コンテンツ幅制限（1200px） |

**実装例：**
```tsx
<div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      {/* タスクカード */}
    </div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      {/* 情報カード */}
    </div>
  </div>
</div>
```

**変更履歴（AWS 風シャープ化）：**
- 2026-06-23：`py-6` → `py-5`、`gap-4` → `gap-3`、`p-6` → `p-5`、`rounded-2xl` → `rounded-lg`、`shadow-sm` → `shadow-xs`

#### フォーム実装ガイド（AWS 風シャープ設計）

フォーム（検索・フィルタ・登録等）は AWS 風シャープ設計をデフォルト値として実装。スキルを参照してください。

**デフォルト値：**

| 要素 | 値 | 説明 |
|------|-----|------|
| **コンテナ上下パディング** | `py-5` | 20px（コンパクト） |
| **コンテナ左右パディング** | `px-4 sm:px-6 lg:px-8` | レスポンシブ |
| **フォーム内ギャップ** | `gap-3` | 12px（コンパクト） |
| **入力フィールド** | `px-2.5 py-1.5` / `text-xs` | 小さく精密 |
| **ボタン** | `px-3 py-1.5` / `text-xs` | 小さく精密 |
| **ボーダーラウンド** | `rounded-lg` | 8px（シャープ） |

**推奨指示方法：**

**パターン 1: Skill 参照（推奨・最も推奨）**
```
フォームを /form-implementation-guide に従って、AWS 風シャープ設計で実装してください
```
→ スキル更新時に自動で最新の仕様が反映される

**パターン 2: クラスを明示指定**
```
フォームコンテナを <div className="px-4 sm:px-6 lg:px-8 py-5"> でラップし、
内部ギャップを gap-3 で、入力フィールドを px-2.5 py-1.5 text-xs で実装してください
```
→ 確実だが、標準変更時に個別修正が必要

**パターン 3: ガイド参照（簡潔指示）**
```
フォームを AWS 風シャープ設計でメイン領域に実装してください
（CLAUDE.md 「フォーム実装ガイド」参照）
```
→ 開発者が本ガイドを参照して実装

#### DataTable コンポーネント仕様

`src/components/ui/DataTable.tsx` はプロジェクト全体で再利用可能なテーブルコンポーネント。AWS コンソール風のコンパクト設計。

**レイアウト標準（重要）：**
- ヘッダー行・データ行：`py-1`（上下パディング 4px）← コンパクト密度
- 左右パディング：`px-4`（16px）
- 行の高さ：自動（コンテンツに応じて調整）
- ホバー背景：`#f6f8fa`（淡いグレー）
- ボーダー：1px `#e2e6ec`（淡いグレー）

**機能：**
- `searchable={true}`：検索バー表示（テーブル上部）
- `selectable={true}`：チェックボックス列表示
- `sortable={true}`：ソート可能な列（ヘッダーにアイコン表示）
- `onSortChange`：外部ソート制御（複雑なソートロジックはコンポーネント外で管理）
- `itemsPerPage`：デフォルト 20 件/ページ

**使用例：**
```tsx
<DataTable
  columns={columns}
  data={items}
  searchable={true}
  searchPlaceholder="検索..."
  searchKey="name"
  selectable={true}
  selectedIds={selectedIds}
  onSelectChange={setSelectedIds}
  sortKey={sortColumn}
  sortOrder={sortDirection}
  onSortChange={handleSort}
  getRowId={item => item.id}
/>
```

**Column<T> インターフェース：**
- `key`：データキー（`keyof T`）
- `label`：ヘッダーテキスト
- `sortable?`：ソート可能か（デフォルト false）
- `render?`：カスタムセルレンダリング関数
- `width?`：列幅（Tailwind クラス、例：`w-20`）

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

| 禁止操作                                                        | 理由                                           |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `supabase db reset` の実行                                      | ローカルデータが消滅する                       |
| エンドユーザー向け `actions.ts` で `createAdminClient()` を使用 | RLS バイパスによるテナント横断アクセスのリスク |
| 新規テーブルに RLS ポリシーを設定しない                         | 他社データ漏洩の直接原因                       |
| `app/api/` に不要な API Route を追加                            | 外部連携以外は Server Actions に集約する       |
| URL のハードコード                                              | `APP_ROUTES` 定数を使う                        |
| `npx supabase` の使用                                           | グローバルインストール版の `supabase` を使う   |

---

## 環境変数

| 変数名                          | 用途                                        |
| ------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase API URL（公開）                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開）                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase サービスロールキー（サーバー専用） |
| `DATABASE_URL`                  | PostgreSQL 直接接続 URL                     |
| `OPENAI_API_KEY`                | OpenAI API キー                             |
| `SERPAPI_API_KEY`               | 求人検索 API キー                           |

詳細は `.env.example` を参照。
