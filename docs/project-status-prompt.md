# HR-dx SaaS マルチテナント管理システム — 現在の開発状況プロンプト

> **このプロンプトは、新しいAIセッション開始時に現在のプロジェクト状態を正確に伝えるために使用します。**

---

## プロジェクト概要

**HR-dx** は、複数テナント（会社）が同一の業務アプリケーション群を共有しつつ、データは完全に分離された状態で運用する **マルチテナントSaaS** です。

---

## 開発環境（構築済み）

### 実行環境

| 項目 | 内容 |
|---|---|
| OS | WSL (Ubuntu 24.04) |
| ランタイム | Node.js |
| パッケージマネージャ | npm |
| 開発ポート | 3000 (`npm run dev`) |

### 技術スタック（導入・設定済み）

| カテゴリ | ツール/バージョン |
|---|---|
| フレームワーク | **Next.js 16.1.6** (App Router) |
| 言語 | **TypeScript 5.x** |
| UIライブラリ | **React 19.2.3** |
| スタイリング | **Tailwind CSS v4** + `@stitches/react` (一部) |
| BaaS | **Supabase** (ローカル Docker) — `supabase start` で起動 |
| ORM/DB | Supabase PostgreSQL (RLS有効) |
| バリデーション | **Zod v4** |
| アイコン | **Lucide React** |
| チャート | **Recharts v3** |
| メール | **Nodemailer** |
| フォント | Noto Sans JP, Geist Mono (Google Fonts) |
| Linter/Formatter | ESLint 9 + Prettier |

### Supabaseクライアント（`src/lib/supabase/` — 構築済み）

| ファイル | 用途 |
|---|---|
| `client.ts` | ブラウザ用（anon key） |
| `server.ts` | Server Component / Server Action 用 (cookie連携) |
| `admin.ts` | SaaS管理者専用（service_role key、RLSバイパス） |
| `middleware.ts` | Middleware用クライアント生成ヘルパー |
| `types.ts` | DB型定義 |

---

## データベース設計（構築済み）

### 主要テーブル

| テーブル | 役割 | RLS |
|---|---|---|
| `tenants` | テナント（会社）マスタ | `current_tenant_id()` |
| `employees` | 従業員（ユーザー実体）— `auth.users` と `user_id` で紐付け | `current_tenant_id()` |
| `divisions` | 組織（部署）ツリー — `parent_id` で階層管理 | `current_tenant_id()` |
| `app_role` | アプリロール定義 (admin, employee 等) | authenticated読取 / service_role書込 |
| `service_category` | サービスカテゴリ（メニュー大分類） | authenticated読取 / service_role書込 |
| `service` | サービス（業務アプリ）マスタ | authenticated読取 / service_role書込 |
| `app_role_service` | ロール × サービスの権限マッピング | authenticated読取 / service_role書込 |
| `tenant_service` | テナント × サービスの契約管理 | `current_tenant_id()` |
| `access_logs` | アクセスログ（Middleware経由で自動記録） | 有効 |

### RLS関数（構築済み）

- `current_tenant_id()` — `auth.uid()` から `employees.user_id` 経由で `tenant_id` を解決する SECURITY DEFINER 関数

### supaUser（SaaS管理者）ポリシー

- 特定の `auth.uid()` (supaUser) に対して全テーブルへの CRUD を許可するポリシーが設定済み

---

## 認証・認可基盤（構築済み）

### 認証フロー

- **Supabase Auth** によるメール/パスワード認証
- **Middleware** (`src/middleware.ts`) でセッション管理・リダイレクト制御
  - 未認証 → `/login` リダイレクト
  - 認証済みで `/login` アクセス → `/top` リダイレクト
  - パスワードリセットフロー対応
  - アクセスログの非同期記録 (`event.waitUntil`)

### ユーザー情報管理

| コンポーネント | ファイル | 役割 |
|---|---|---|
| `getServerUser()` | `src/lib/auth/server-user.ts` | SC層でユーザー情報を一括取得 (employees + app_role + tenants JOIN) |
| `AuthProvider` / `useAuth()` | `src/lib/auth/context.tsx` | クライアント側でユーザー情報を参照 |
| `TenantProvider` / `useTenant()` | `src/lib/tenant/context.tsx` | クライアント側でテナント情報を参照 |

### ユーザー型定義 (`src/types/auth.ts`)

```typescript
interface AppUser {
  id: string;
  email?: string;
  name: string;
  role: string;        // user_metadata.role (supaUser / admin / member)
  appRole?: string;    // app_role テーブルから取得 (admin / employee 等)
  tenant_id?: string;
  tenant_name?: string;
}
```

### ルーティング定数 (`src/config/routes.ts`)

```typescript
export const APP_ROUTES = {
  AUTH: { LOGIN: '/login', SIGNUP: '/signup', RESET_PASSWORD: '/reset-password' },
  TENANT: { PORTAL: '/top', ADMIN: '/adm' },
  SAAS: { DASHBOARD: '/saas_adm', TENANTS: '/saas_adm/tenants', SYSTEM_MASTER: '/saas_adm/system-master' },
} as const;
```

---

## レイアウト・メニュー基盤（構築済み）

### 共通レイアウト (`src/components/layout/`)

| コンポーネント | 役割 |
|---|---|
| `AppLayout.tsx` | 全variant共通の最上位レイアウト。variant (`portal`/`admin`/`saas`) で配色切替。AuthProvider + TenantProvider を注入 |
| `AppHeader.tsx` | ヘッダー。variant別配色。ロゴ、ナビゲーション（管理へ / SaaS管理へ / ポータルへ戻る）、ユーザー情報表示 |
| `AppSidebar.tsx` | サイドバーラッパー。サーバーコンポーネントとしてメニューデータ取得 → `SidebarNav` へ props 渡し |
| `SidebarNav.tsx` | サイドバー本体（Client Component）。DBから取得したカテゴリをリンクとして動的描画。ダッシュボード / カテゴリ / ログアウト |
| `Footer.tsx` | フッター |

### メニュー構造（DB駆動 — 構築済み）

メニューは **`service_category` → `service` → `tenant_service`** のDB構造で動的に構築されています。

```
サイドバー表示フロー:
1. AppSidebar (Server Component)
   → getServerUser() でユーザー情報取得
   → getTenantMenu() でテナント契約サービスをDB取得
   → SidebarNav (Client Component) へ categories を props で渡す
2. SidebarNav
   → カテゴリをループ描画
   → クリック → /top/subMenu?service_category_id=xxx へ遷移
   → 配下サービス一覧を表示
```

### メニュー取得ロジック (`src/lib/menu-service.ts` — 構築済み)

```
getTenantMenu(supabase, tenantId, targetAudience)
  1. tenant_service から契約 service_id を取得
  2. service + service_category をJOINで取得
  3. カテゴリごとにグルーピング・ソート
  → MenuCategory[] を返却
```

---

## App Router 構造（構築済み）

```
src/app/
 ├── layout.tsx              # ルートレイアウト (Noto Sans JP, Tailwind)
 ├── page.tsx                # "/" → /login リダイレクト
 │
 ├── (auth)/                 # 【認証グループ】
 │   ├── layout.tsx
 │   ├── login/page.tsx       # ログイン画面
 │   ├── signup/page.tsx      # 新規登録画面
 │   └── reset-password/page.tsx  # パスワードリセット
 │
 ├── (tenant)/               # 【テナントグループ — 一般ユーザー】
 │   ├── (default)/           # ポータル・業務メニュー
 │   │   ├── layout.tsx       # AppLayout variant='portal'
 │   │   ├── top/page.tsx     # ポータルダッシュボード
 │   │   └── biz/...          # 業務メニュー
 │   ├── (colored)/           # 管理者メニュー
 │   │   ├── layout.tsx       # AppLayout variant='admin'
 │   │   └── adm/...          # テナント管理画面
 │   ├── apps/                # 業務アプリページ
 │   │   ├── attendance/      # 勤怠アプリ
 │   │   ├── payroll/         # 給与アプリ
 │   │   └── invoice/         # 請求アプリ
 │   └── settings/            # 設定画面
 │
 ├── (saas-admin)/            # 【SaaS管理者グループ — supaUser専用】
 │   ├── layout.tsx           # AppLayout variant='saas'
 │   ├── error.tsx / loading.tsx
 │   └── saas_adm/
 │       ├── page.tsx         # SaaSダッシュボード
 │       ├── tenants/         # テナント管理（一覧 + 詳細）
 │       ├── system-master/   # システムマスタ管理
 │       └── subMenu/         # サブメニュー
 │
 ├── (admin)/                 # 【SaaS管理(admin)グループ】
 │   ├── layout.tsx
 │   ├── menus/               # メニュー管理
 │   ├── monitoring/          # 監視
 │   ├── tenants/             # テナント管理
 │   └── users/               # ユーザー管理
 │
 └── api/                     # APIルート (Webhook等のみ)
     ├── auth/                # 認証コールバック
     ├── system-master/       # システムマスタAPI
     └── webhooks/            # Webhook
```

---

## features/ ドメイン（構築済み）

| ドメイン | 内容 | 主要コンポーネント |
|---|---|---|
| `system-master` | SaaSマスタ管理（サービス/カテゴリ/ロール/テナントサービス） | ServiceTab, ServiceCategoryTab, AppRoleTab, AppRoleServiceTab, TenantServiceTab, SystemMasterTabs |
| `organization` | 組織管理（部署ツリー + 従業員管理） | DivisionTree, DivisionFormDialog, EmployeeTable, EmployeeFormDialog |
| `tenant-management` | テナント管理（SaaS管理者用） | TenantManagementPage, TenantFormDialog |
| `saas-dashboard` | SaaSダッシュボード | queries.ts, DashboardUI |

各ドメインは以下の構造に従います:

```
features/[domain]/
 ├── actions.ts       # Server Actions (INSERT/UPDATE/DELETE)
 ├── queries.ts       # データ取得 (SELECT)
 ├── types.ts         # 型定義
 ├── schemas/         # Zodバリデーション
 ├── components/      # ドメイン固有UIコンポーネント
 ├── hooks/           # カスタムフック
 └── index.ts         # barrel export
```

---

## 共通UIコンポーネント (`src/components/ui/` — 構築済み)

- `Button.tsx`, `Card.tsx`, `Badge.tsx`, `StatusCard.tsx`, `DepartmentCard.tsx`, `QuickAccessCard.tsx`
- `data-table.tsx`, `dialog.tsx` — 汎用テーブル・ダイアログ
- `stitches.tsx` — Stitches ベースのテーマ付きUI

---

## その他の構築済み機能

| 機能 | 状態 | 詳細 |
|---|---|---|
| アクセスログ | 構築済み | Middleware の `event.waitUntil()` で非同期記録。`access_logs` テーブルに保存 |
| 監査ログ | 構築済み | `writeAuditLog()` Server Action。ログアウト等のイベントを記録 |
| メール送信 | 構築済み | Nodemailer ベース。パスワードリセット・招待メール |
| カスタムフック | 構築済み | `useAuth`, `useTenant`, `useMenu`, `useSupabase` |
| レスポンシブデザイン | 対応済み | モバイル対応ハンバーガーメニュー、md: ブレークポイント |
| エラー/ローディング | 配置済み | 各ルートグループに `error.tsx` + `loading.tsx` 配置 |

---

## 開発ルール（厳守事項）

1. **コマンド**: `npx supabase` は使用禁止。`supabase` コマンドを直接使用
2. **データアクセス**: `queries.ts` (SELECT) / `actions.ts` (INSERT/UPDATE/DELETE) に分離。page.tsx に直接 `supabase.from()` 禁止
3. **Supabaseクライアント**: 一般処理は `createClient()`、SaaS管理のみ `createAdminClient()`
4. **ルーティング**: Magic String 禁止。`APP_ROUTES` 定数を使用
5. **ユーザー情報**: `getServerUser()` で一括取得 → Context経由で配布
6. **RLS**: 全テーブルで有効。`current_tenant_id()` でテナント分離を自動化
7. **言語**: 日本語 + 英語の多言語対応
8. **レスポンシブ**: レスポンシブデザイン必須

---

## 現在のステータスまとめ

> **開発環境、認証基盤、メニュー基盤、レイアウト、主要な管理機能（テナント管理・システムマスタ・組織管理・SaaSダッシュボード）は全て構築済みです。**
>
> これから開発するのは、`service` テーブルに登録された **個別の業務アプリ（給与計算、勤怠管理、請求管理など）** の画面・ロジック実装です。
> メニュー構造はDBで管理されるため、新しいアプリの追加は `features/` にドメインフォルダを作成し、`service` テーブルにレコードを追加するだけで自動的にメニューに反映されます。
