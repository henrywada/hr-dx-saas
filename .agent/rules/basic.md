---
trigger: always_on
---

### 1. 目的

本プロジェクトは、マルチテナント対応のHR-DX SaaSプラットフォームです。Next.js (App Router) と Supabase を基盤とし、テナント間のデータ分離と高度なセキュリティを確保しながら、モダンでプレミアムなユーザーエクスペリエンスを提供することを目的としています。

具体的には以下を実現する：

- 同一コードベースの業務アプリ（採用支援・組織健康度チェック等）を複数テナントで共有利用
- テナント間のデータ完全分離（Supabase RLS）
- メニュー構造の動的な増減に対応
- アプリ単位での権限・表示制御
- 全従業員、テナント管理者による権限別のメニュー構造
- SaaS管理者（supaUser）によるテナント横断のシステム全体管理
- 保守性・拡張性を最優先としたアーキテクチャ

---

### 2. 設計方針

1.  **マルチテナント・ファースト**: すべてのデータは `tenant_id` で分割され、SupabaseのRLS (Row Level Security) によって物理的・論理的に厳格に隔離されます。他社のデータが絶対に漏洩しない設計を最優先事項とします。
2.  **フィーチャー・ベース・アーキテクチャ**: ビジネスドメインごとに `src/features` 内にロジック（Server Actions, Component, Types 等）をカプセル化します。これにより、機能追加や保守を容易な疎結合な構成を実現します。
3.  **Next.js App Router の活用**: ルートグループ（`(tenant)` など）を使用してテナントコンテキストを管理します。
4.  **役割別のページ配置ルール**: 権限や役割に応じて、以下のディレクトリにページコンポーネントを配置します。
    - **テナント利用者（従業員）**: `src/app/(tenant)/(default)/`
    - **テナント管理者（人事等）**: `src/app/(tenant)/(colored)/adm/`
    - **SaaS管理者（サービス運営者）**: `src/app/(saas-admin)/saas_adm/`
5.  **Server Actions によるデータ整合性**: データベース操作は主に Server Actions を通じて行い、サーバーサイドでの検証と実行を徹底します。
6.  **プレミアムなUI/UX**: モダンでプレミアム感のあるデザイン、レスポンシブ対応、多言語対応（日本語・英語）を標準要件とし、ユーザーに「感動」を与えるインターフェースを目指します。
7.  **WSL (Ubuntu) 上のローカル開発**: 開発環境は WSL (Ubuntu) 上に構築し、`supabase start` でコンテナベースのDBを利用します。ターミナルコマンドは WSL で実行し、`npx supabase` ではなくグローバルインストールの `supabase` を直接使用してください。
8.  **回答言語**: 回答や Artifact は「日本語」で行ってください。

---

### 3. データアクセスと実装ルール

- **APIルートの禁止**: `app/api/...` は Webhook など外部連携を除き原則作成しない。データ操作は Server Actions に集約する。
- **Server Components 中心**: データ取得が必要なページは非同期 Server Component とし、取得後に Client Component へ Props で渡す。`useEffect` + `fetch` によるクライアント側のデータ取得は避ける。
- **クエリとアクションの分離**:
  - 読み取り（SELECT）: `src/features/[ドメイン]/queries.ts` に関数として定義する。
  - 書き込み（INSERT/UPDATE/DELETE）: `src/features/[ドメイン]/actions.ts` に Server Action として定義する。
  - `page.tsx` 内に直接 `supabase.from(...)` を書かない。
- **Supabase クライアントの使い分け**:
  - `createClient()`（`@/lib/supabase/server` または `client`）: 一般ユーザー・テナント管理者用。RLS でテナント分離。通常はこちらを使用する。
  - `createAdminClient()`（`@/lib/supabase/admin`）: SaaS管理者（`role: 'supaUser'`）専用またはバッチ用。RLS をバイパスするため、エンドユーザーが触れる `actions.ts` 内では使用しない。
- **ユーザー情報の扱い**: 実体・権限（`app_role`）・所属（`tenant_id`）は `public.employees` にあり、`auth.users` は認証のみ。ユーザー情報は `getServerUser()`（`@/lib/auth/server-user.ts`）で一度取得し、`AuthProvider` / `TenantProvider` で下層に渡す。コンポーネントでは `useAuth()` / `useTenant()` で参照する。
- **ルーティング**: URL をベタ書きせず `import { APP_ROUTES } from '@/config/routes'` の定数を使う。認証・認可は `src/middleware.ts` およびレイアウトの Server Component で担保する。
- **UX**: データ待ちが発生するルートには `loading.tsx`（スケルトン/Spinner）を置く。同階層に `error.tsx`（再試行付き）を標準で配置する。

---

### 4. プロジェクト構造

- `src/app/`: Next.js App Router のディレクトリ構成。
  - `(tenant)/(default)/`: 一般従業員向けの通常画面（白基調など、標準的なレイアウト）。
  - `(tenant)/(colored)/adm/`: テナント企業（顧客企業）の人事・管理者向け画面（テーマカラー等が適用される管理コンソール）。
  - `(saas-admin)/saas_adm/`: 本システムの運営会社（プロバイダー）向けの全体管理画面。
  - `service_role/`: 内部管理用または特権的な操作が必要なルート。
- `src/features/`: 機能ドメイン（マイページ、ストレスチェック、採用AI等）ごとのコード。
  - `myou/`, `stress-check/`, `talent-draft/`, `tenant-management/` など。
  - `actions.ts`: その機能に紐づく Server Actions を集約。
- `src/components/`: 共有 UI コンポーネント。
  - `ui/`: ボタン、ダイアログなどの基礎コンポーネント（Shadcn基準）。
  - `layout/`: アプリケーション全体のレイアウト、ナビゲーション等。
- `src/lib/`: 外部接続用クライアントや共通ユーティリティ。
  - `supabase/`: Supabase クライアント定義（client, server, admin）。
- `src/types/`: アプリケーション全体で使い回す共有型定義。
- `supabase/`: Supabase の設定とデータベース定義。
  - `migrations/`: SQLマイグレーションファイル（テーブル定義、RLSポリシー等）。
  - `seed.sql`: 開発用シードデータ。
