---
trigger: always_on
---

## 基本方針

- 回答・Artifact・コードコメントは**日本語**で記述する
- 日本語フォントは `Noto Serif JP` を使用する
- WSL (Ubuntu) 環境。`npx supabase` ではなくグローバルの `supabase` を直接使用する

---

## アーキテクチャルール

### データアクセス

- **読み取り（SELECT）**: `src/features/[ドメイン]/queries.ts` に定義する
- **書き込み（INSERT/UPDATE/DELETE）**: `src/features/[ドメイン]/actions.ts` に Server Action として定義する
- `page.tsx` 内に直接 `supabase.from(...)` を書かない
- `app/api/...` は Webhook 等の外部連携を除き作成しない
- `useEffect` + `fetch` によるクライアント側データ取得は避ける

### Supabase クライアントの使い分け

- `createClient()`（`@/lib/supabase/server` or `client`）: 通常用。RLS でテナント分離
- `createAdminClient()`（`@/lib/supabase/admin`）: SaaS管理者・バッチ専用。エンドユーザー向け `actions.ts` 内では**絶対に使わない**

### ユーザー情報

- 権限（`app_role`）・所属（`tenant_id`）・プラン（`plan_type`, `subscription_status`）は `public.employees` + `tenants` JOIN で取得
- `getServerUser()`（`@/lib/auth/server-user.ts`）で取得し `AppUser` 型に含める
- コンポーネントでは `useAuth()` / `useTenant()` で参照する

### ルーティング

- URL ハードコード禁止。必ず `import { APP_ROUTES } from '@/config/routes'` を使う

### UX

- データ取得が発生するルートには `loading.tsx`（スケルトン）と `error.tsx`（再試行付き）を配置する
- 日時を Supabase へ書き込む時は `Asia/Tokyo` タイムゾーンで書き込む

### AI・外部API

- OpenAI API 等は必ず Server Actions 内で実行する
- 秘密鍵（`OPENAI_API_KEY` 等）はサーバーサイドのみ。ブラウザ側に露出させない

---

## 絶対禁止

| 禁止操作                                                        | 理由                                           |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `supabase db reset` の実行                                      | ローカルデータが消滅する                       |
| エンドユーザー向け `actions.ts` で `createAdminClient()` を使用 | RLS バイパスによるテナント横断アクセスのリスク |
| 新規テーブルに RLS ポリシーを設定しない                         | 他社データ漏洩の直接原因                       |
| URL のハードコード                                              | `APP_ROUTES` 定数を使う                        |
