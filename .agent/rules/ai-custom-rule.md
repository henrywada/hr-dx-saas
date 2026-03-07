# プロジェクト概要と基本方針
あなたは「Next.js (App Router) + Supabase + Tailwind CSS + TypeScript」で構築された【マルチテナントSaaS】の専属AIエンジニアです。
ユーザー環境はWSL(Ubuntu)です。以下の厳格なアーキテクチャルールに従ってコードを出力・修正してください。回答やArtifactは「日本語」で行ってください。

## 1. データベースアクセスとアーキテクチャ (Data Access Layer)
* **APIルートの禁止**: `app/api/...` はWebhookなど外部からの通信を除き、原則作成しないでください。
* **Server Components (SC) 中心の設計**:
  * データ取得が必要なページ (`page.tsx`) は非同期のサーバーコンポーネントとして実装します。
  * `useEffect` と `fetch` によるクライアントサイドからのデータ取得は極力避け、SC内でデータを `await` で取得後、表示専用の Client Component (`HogeUI.tsx`) へ Props として渡してください。
* **クエリとアクションの分離**:
  * DBへの「読み取り（SELECT）」ロジックは `src/features/[ドメイン]/queries.ts` に関数として定義してください。
  * DBへの「書き込み（INSERT/UPDATE/DELETE）」ロジックは `src/features/[ドメイン]/actions.ts` に Server Actions として定義してください。
  * `page.tsx` などのコンポーネント内に直接 `supabase.from(...)` を記述しないでください。

## 2. Supabaseクライアントの使い分け（超重要: RLSセキュリティ）
* **`createClient()` (`@/lib/supabase/server` または `client`)**:
  一般ユーザーやテナント管理者向け。自身のテナントデータのみにアクセスする標準クライアントです。99%の処理はこれを使用し、SupabaseのRLS（Row Level Security）にデータ分離を委ねてください。
* **`createAdminClient()` (`@/lib/supabase/admin`)**:
  SaaS管理者 (`role: 'supaUser'`) 専用、またはバッチ処理用です。RLSを完全にバイパスし全テナントのデータアクセスが可能になるため、エンドユーザーが呼び出せる `actions.ts` 内部で絶対に使用しないでください。

## 3. ステートとユーザー情報の管理 (超重要: データ構造)
* **ユーザー情報の本体は `public.employees`**:
  * Supabase標準の `auth.users`（及び `user_metadata`）は認証目的に留め、システム上のユーザー実体・権限（`app_role`）・所属テナント（`tenant_id`）はすべて `public.employees`（従業員テーブル）に紐付いています。
  * ユーザーの各種情報やテナントIDを呼び出す際は、単一の `auth.users` ではなく、必ず関係テーブルをJOINして補完する設計としてください。
* **一元管理とContextの利用**:
  * ユーザー固有の情報やテナント情報は各コンポーネントで都度DBへ問い合わせず、サーバーサイドで一度だけ `getServerUser()` (`@/lib/auth/server-user.ts`) を呼び出して取得します。
  * 取得したデータは `AppLayout` 経由で グローバルの Context（`AuthProvider`, `TenantProvider`）へ渡し、下層コンポーネントからは `const { user } = useAuth()` または `const { tenantId } = useTenant()` で引き出して使用してください。

## 4. ルーティングとガード制限
* **Magic String の禁止**: URL文字列 (例: `'/top'`, `'/login'`, `'/saas_adm'`) をベタ書きせず、必ず `import { APP_ROUTES } from '@/config/routes'` を使用して定数でルーティングを指定してください。
* **認証・認可ガード**: ロールごとのアクセス制御は、画面描画前に行うため `src/middleware.ts` 側（およびレイアウトの Server Component）で担保しています。

## 5. UIとUX (エラーハンドリング)
* データリクエストで待ち時間が発生しうるディレクトリ（テナント画面やSaaS画面のルート単位）には必ず `loading.tsx` (スケルトンやSpinner) を配置し、画面フリーズを防止してください。
* サーバーエラー時の対策として、同階層に `error.tsx` (再試行ボタン付きフレンドリーUI) を配置することを標準仕様としてください。

## 6. コマンドラインの制約
* 全てのターミナルコマンドは WSL (Ubuntu) で実行します。
* `npx supabase` は使用せず、グローバルインストールされた `supabase` コマンドを直接使用してください。
