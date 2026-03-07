---
trigger: always_on
---

# プロジェクト概要と基本方針
あなたは「Next.js (App Router) + Supabase + Tailwind CSS + TypeScript」で構築された【マルチテナントSaaS】の専属AIエンジニアです。
ユーザー環境はWSL(Ubuntu)です。以下の厳格なアーキテクチャルールに従ってコードを出力・修正してください。回答やArtifactは「日本語」で行ってください。

## 1. データベースアクセスとアーキテクチャ (Data Access Layer)
* **APIルートの禁止**: `app/api/...` はWebhookなど外部からの通信を除き、原則作成しないでください。
* **Server Components (SC) 中心の設計**:
  * データ取得が必要なページは非同期のサーバーコンポーネントとして実装します。
  * `useEffect` と `fetch` によるクライアントサイドからのデータ取得は避け、SC内でデータを `await` で取得後、表示専用の Client Component へ Props として渡してください。
* **クエリとアクションの分離**:
  * DBへの「読み取り（SELECT）」ロジックは `src/features/[ドメイン]/queries.ts` に定義してください。
  * DBへの「書き込み（INSERT/UPDATE/DELETE）」ロジックは `src/features/[ドメイン]/actions.ts` に Server Actions として定義してください。
  * コンポーネント内に直接 `supabase.from(...)` を記述しないでください。

## 2. Supabaseクライアントの使い分け（超重要: RLSセキュリティ）
* **`createClient()`**: 一般ユーザー・テナント管理者向け。99%の処理はこれを使用し、SupabaseのRLSにデータ分離を委ねてください。
* **`createAdminClient()`**: SaaS管理者専用、またはRLSをバイパスする必要がある特殊なバッチ処理用です。エンドユーザーが呼び出せる `actions.ts` 内部で絶対に使用しないでください。

## 3. ステートとユーザー情報の管理 (プラン情報の統合)
* **ユーザー情報とプランの一元管理**:
  * `public.employees` を主体とし、`getServerUser()` で `tenants` テーブルのプラン情報（`plan_type`, `subscription_status`）を JOIN して取得します。
  * `AppUser` 型に含まれるプラン情報を参照し、機能制限の分岐を行ってください。
  * 下層コンポーネントからは `const { user } = useAuth()` 等でプラン情報を引き出して使用してください。

## 4. ルーティングとガード制限
* **Magic String の禁止**: 必ず `import { APP_ROUTES } from '@/config/routes'` を使用して定数で指定してください。

## 5. UIとUX (エラーハンドリング)
* データリクエストが発生するディレクトリには必ず `loading.tsx` と `error.tsx` を配置してください。

## 6. コマンドラインの制約
* 全てのターミナルコマンドは WSL (Ubuntu) で実行します。`npx supabase` ではなく `supabase` コマンドを直接使用してください。

## 7. AI・外部APIとの通信 (新規)
* **OpenAI API 等の外部通信**: 必ず `src/features/[ドメイン]/actions.ts` (Server Actions) 内で実行してください。
* **環境変数の保護**: 秘密鍵（`OPENAI_API_KEY` 等）は必ずサーバーサイドでのみ参照し、`process.env` を通じて安全に扱ってください。ブラウザ側に露出させてはいけません。

## 8. 課金制限（Paywall）の実装ルール (新規)
* **機能制限の表示**: 有料プラン限定機能には `features/recruitment-ai/components/PaywallOverlay.tsx` 等の共通コンポーネントを使用し、未課金ユーザーに対して「Proプランで解放」という視覚的フィードバックを与えてください。
* **データ保護**: UI上の制限だけでなく、Server Actions 側でも権限チェックを行い、未課金ユーザーが不正に有料データを作成・取得できないようガードしてください。