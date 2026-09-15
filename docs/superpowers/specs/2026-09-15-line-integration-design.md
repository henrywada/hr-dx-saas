# LINE連携（既存従業員の友だち紐付け + LIFF自動ログイン）設計書

- 日付: 2026-09-15
- ステータス: 設計承認済み（2026-09-15）
- 移植元: `dx-sensor` の LINE 基盤および友だち招待（新規アカウント作成フローは対象外）
- 関連: `dx-sensor/docs/superpowers/specs/2026-09-02-line-integration-design.md`、`dx-sensor/docs/superpowers/specs/2026-09-02-line-friend-invite-design.md`

## 1. 背景・目的

hr-dx-saas に LINE 公式アカウント連携が無い。現場の従業員が LINE から `/top` を開き、以降は ID/パスワード無しで入れるようにする。人事は既存従業員へ招待メールを送り、QR 経由で友だち追加とアカウント紐付けを完了させる。

プロダクトの2大ゴールのうち「コミュニケーションを大切にするシステム」の到達手段として、従業員が日常使う LINE を入口にする。Push 通知はこの設計の対象外とし、紐付けと自動ログインの土台だけを入れる。

## 2. 確定した方針

| 項目             | 決定                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| 範囲             | 基盤 + 既存従業員の友だち招待 + LIFF 自動ログイン                                       |
| 公式アカウント   | 全テナント共用の1アカウント。接続状態は SaaS 管理者が見る                               |
| テナント管理画面 | `/adm/line-friend-invites`（`(tenant-admin)/adm/(base_mnt)`）                           |
| SaaS 管理画面    | `/saas_adm/line`                                                                        |
| LIFF ログイン後  | 常に `/top`。権限による `/adm` 分岐はしない                                             |
| 招待の起点       | テナント管理者のみ。従業員の自己連携は作らない                                          |
| 新規ユーザー作成 | コピーしない（`tenant_member_invites` / `/liff/link` / `invite-accept` は持ってこない） |
| メール           | 既存の `sendMail`（SMTP）。Resend は使わない                                            |
| 実装方針         | `dx-sensor` の動くコードを、`employees` / Server Action / RLS ヘルパーに読み替えて移植  |

## 3. 全体フロー

```
テナント管理者 /adm/line-friend-invites
  → Server Action で line_friend_invites 発行 + メール
  → 従業員が /p/line-friend-invite/[token] を開く（QR）
  → LINE でスキャン → /liff/friend-link/[token]
  → POST /api/line/friend-link-accept
  → line_friends.status = linked

以降のリッチメニュー
  → /liff/entry
  → POST /api/line/liff-auth
  → Supabase Cookie セッション確立
  → /top
```

LINE Webhook（follow / unfollow）は上記と独立して `line_friends` の status を更新する。

## 4. データモデル

マイグレーションは `CREATE TABLE IF NOT EXISTS`、RLS 必須、テナント判定は `public.current_tenant_id()`、SaaS 管理者判定は `public.current_employee_app_role() = 'developer'`。`employees` の認証ユーザー列は `user_id`（`auth_user_id` は使わない）。

### 4.1 `line_friends`

LINE ユーザーと従業員の紐付け。follow 時点では本人が分からないため、`tenant_id` / `employee_id` / `user_id` は nullable。

| カラム                      | 型                                             | 内容                                                      |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `id`                        | uuid PK                                        | `gen_random_uuid()`                                       |
| `line_user_id`              | text UNIQUE NOT NULL                           | LINE ユーザー ID。共用公式アカウントなので全体で1人1 LINE |
| `tenant_id`                 | uuid NULL → `tenants(id)` ON DELETE CASCADE    | 紐付け後に入る                                            |
| `employee_id`               | uuid NULL → `employees(id)` ON DELETE CASCADE  | 紐付け後に入る                                            |
| `user_id`                   | uuid NULL → `auth.users(id)` ON DELETE CASCADE | 紐付け後に入る。セッション確立に使う                      |
| `display_name`              | text NULL                                      | LINE 表示名（取れた場合のみ）                             |
| `status`                    | text NOT NULL DEFAULT `'unlinked'`             | `unlinked` / `linked` / `blocked`                         |
| `linked_at`                 | timestamptz NULL                               | `linked` にした時刻                                       |
| `created_at` / `updated_at` | timestamptz                                    | 作成・更新                                                |

制約:

- `status IN ('unlinked', 'linked', 'blocked')`
- `line_user_id` UNIQUE（1 LINE アカウント = 1人）
- 部分 UNIQUE: `employee_id` WHERE `status = 'linked' AND employee_id IS NOT NULL`（1従業員 = 紐付け済み LINE は1つ）

Webhook:

- `follow` かつ行が無い → `unlinked` を insert（tenant/employee/user は空）
- `follow` かつ既存が `blocked` → `user_id` があれば `linked`、無ければ `unlinked` に戻す（ブロック解除デッドロックを避ける）
- `unfollow` → `blocked`
- `message` は無視する。あいさつメッセージは LINE 公式アカウント側に任せる

### 4.2 `line_friend_invites`

既存従業員向けの招待トークン。新規 `auth.users` は作らない。

| カラム         | 型                                                | 内容                       |
| -------------- | ------------------------------------------------- | -------------------------- |
| `id`           | uuid PK                                           |                            |
| `tenant_id`    | uuid NOT NULL → `tenants(id)` ON DELETE CASCADE   |                            |
| `employee_id`  | uuid NOT NULL → `employees(id)` ON DELETE CASCADE | 招待対象                   |
| `invite_token` | text UNIQUE NOT NULL                              |                            |
| `created_by`   | uuid NOT NULL → `auth.users(id)`                  | 発行した管理者の `user_id` |
| `expires_at`   | timestamptz NOT NULL                              | 発行から 72 時間           |
| `used_at`      | timestamptz NULL                                  | 原子的に埋める             |
| `created_at`   | timestamptz NOT NULL                              |                            |

招待対象: 自テナントの `employees` のうち `user_id IS NOT NULL` かつ、同一テナントで `line_friends.status = 'linked'` が無い人。`user_id` が無い従業員は出せない（メールもセッションも解決できない）。`active_status` での自動除外はしない。管理者が一覧から選ぶ。

### 4.3 RLS

`line_friends`:

- SELECT: `tenant_id = current_tenant_id()` または `current_employee_app_role() = 'developer'`
- INSERT / UPDATE / DELETE の authenticated ポリシーは作らない。書き込みは Webhook / LIFF 用の service_role（`createAdminClient()`）のみ
- `GRANT SELECT` を authenticated に付与

`line_friend_invites`:

- ALL: 自テナントかつ `current_employee_app_role() <> 'employee'`。developer は全テナント
- `GRANT SELECT, INSERT, UPDATE, DELETE` を authenticated に付与
- 公開 QR ページと `friend-link-accept` は service_role でトークンを読む（未ログインのため RLS を通さない）

## 5. 画面とルート

`APP_ROUTES` に定数を追加する。URL のハードコード禁止。

### 5.1 テナント管理者 `/adm/line-friend-invites`

- 配置: `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/`
- `page.tsx` は Server Component。`features/line/queries.ts` で候補を取得し Client に渡す
- UI: `docs/ui/admin-card-and-table.md`（メインカード + 一覧テーブル）。フル幅型（パターン B）
- 操作: 未連携従業員を複数選択し「招待メールを送信」。部分成功（1件失敗が他を止めない）
- 権限: `getServerUser()` の `appRole === 'employee'` なら `/top` へ（既存 admin layout のガードに任せる）
- メニュー: `service` マスタの「基本設定」カテゴリに追加。`tenant_service` と `app_role_service` の両方でフィルタされる既存方式に載せる
- `loading.tsx` / `error.tsx` を置く

### 5.2 SaaS管理者 `/saas_adm/line`

- 配置: `src/app/(saas-admin)/saas_adm/line/`
- 表示: 環境変数の**設定有無**（`LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_LOGIN_CHANNEL_ID` / `NEXT_PUBLIC_LIFF_ID`）。値そのものは出さない
- 表示: 全テナントの `linked` / `unlinked` / `blocked` 件数
- リッチメニュー作成ボタンは置かない。CLI スクリプトのみ
- `loading.tsx` / `error.tsx` を置く

### 5.3 公開 QR `/p/line-friend-invite/[token]`

- 配置: `src/app/p/line-friend-invite/[token]/page.tsx`
- 既存 `/p/` と同様、middleware で認証不要
- `dynamic = 'force-dynamic'`（使用済み・期限切れ判定をキャッシュしない）
- service_role でトークン照合。無効 / 使用済み / 期限切れで文言を分ける
- 有効なら LIFF URL `https://liff.line.me/{LIFF_ID}/friend-link/{token}` を QR にする
- QR 描画は既存依存 `qrcode.react`（新規 `qrcode` パッケージは入れない）。トークン検証は Server、描画だけ Client
- Next.js 16 のため `params` は `Promise<{ token: string }>`

### 5.4 LIFF（認証不要の独立ルート）

LINE Developers の LIFF エンドポイント URL は個別ページではなく `https://<domain>/liff` にする（`/liff/entry` と `/liff/friend-link` を包含するため）。

| パス                        | 役割                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/liff`                     | `liff.state` を検証し、許可したサブルートへ振る。許可は `/entry` と `/friend-link` のみ。`/link` は作らない |
| `/liff/entry`               | リッチメニューからの自動ログイン。成功後 `window.location.assign('/top')`                                   |
| `/liff/friend-link/[token]` | QR スキャン後の紐付け。完了メッセージを出して終わり（ここでは `/top` に飛ばない）                           |

`resolveLiffStatePath` はプロトコル相対 URL と未知パスを拒否し、失敗時は `/liff/entry` へ落とす。

従業員 `/top` には連携ボタンを置かない。

## 6. API・Server Action・認証

### 6.1 外部向け Route Handler（`src/app/api/line/`）

`app/api/` は Webhook / 外部連携のみ、という既存ルールに合う。LINE プラットフォームと LIFF ブラウザからの POST であり、ログイン Cookie を前提にできない。

middleware の未ログイン 401 から除外するパス:

- `/api/line/webhook`
- `/api/line/friend-link-accept`
- `/api/line/liff-auth`

ページ側の未ログインリダイレクトから除外するパス:

- `/liff` 配下全体
- 既存どおり `/p/` 配下

| エンドポイント                      | クライアント                                         | 処理                                                                                                |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /api/line/webhook`            | `createAdminClient()`                                | `X-Line-Signature` を HMAC-SHA256 検証。失敗は 401。ペイロードはログしない                          |
| `POST /api/line/friend-link-accept` | `createAdminClient()`                                | ID トークン検証 → 招待の `used_at` を `.is('used_at', null)` で原子的に更新 → `line_friends` upsert |
| `POST /api/line/liff-auth`          | `createAdminClient()` + Cookie 付き `createClient()` | ID トークン検証 → `linked` かつ `employees` 在籍 → セッション確立                                   |

`invite-accept` は置かない。

`friend-link-accept` の拒否条件（クライアントには理由コードのみ）:

- トークン無し / 不正 → `token_invalid`
- 期限切れ → `expired`
- 使用済み（原子的更新 0 件を含む） → `already_used`
- その `line_user_id` が別の `user_id` に既に紐付いている → `token_invalid`（付け替え禁止）
- 既に同一従業員へ `linked` → 成功として冪等に倒す

`liff-auth` の在籍確認は `tenant_members` ではなく `employees`（`tenant_id` + `user_id` が一致する行があること）。無ければ `not_linked`。退職などで行が消えていれば自動ログインしない。

セッション確立は `dx-sensor` の `establishSupabaseSession` を移植する（`auth.admin.generateLink({ type: 'magiclink' })` → Cookie クライアントで `verifyOtp`）。エンドユーザー向け `actions.ts` では使わない。

### 6.2 テナント管理者 Server Action

`src/features/line/actions.ts`（`'use server'`）:

- `getServerUser()`。未ログインまたは `appRole === 'employee'` なら拒否
- 招待 insert は RLS 付き `createClient()` のみ。**`createAdminClient()` は actions.ts で使わない**
- メール解決は既存 RPC `get_tenant_employee_auth_email(tenant_id, user_id)`（authenticated に GRANT 済み）
- 送信は `sendMail`。テナント名・氏名は `escapeHtml` する
- メール URL は `{origin}{APP_ROUTES.PUBLIC.LINE_FRIEND_INVITE(token)}`（`/p/line-friend-invite/...`）
- 候補一覧の SELECT は `features/line/queries.ts`

### 6.3 ID トークン検証

`jose` で LINE JWKS（`https://api.line.me/oauth2/v2.1/certs`）を検証する。

- `iss` = `https://access.line.me`
- `aud` = `LINE_LOGIN_CHANNEL_ID`（数値チャネル ID）
- `NEXT_PUBLIC_LIFF_ID` を `aud` に使わない（必ず失敗する）

### 6.4 環境変数（`.env.example` に追記）

```
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_LOGIN_CHANNEL_ID=
NEXT_PUBLIC_LIFF_ID=
```

`LINE_CHANNEL_ACCESS_TOKEN` はリッチメニュー CLI と（将来の）Messaging API 用。Webhook 署名には `LINE_CHANNEL_SECRET` だけが要る。

## 7. CSP

アプリ全体の CSP は緩めない。middleware で pathname が `/liff` で始まるときだけ、LIFF SDK 用オリジンを足した CSP を返す（SCORM 教材と同じ「パス別 CSP」）。

許可する外部オリジン（LIFF SDK 2.x が実アクセスするもの）:

- `script-src`: `'self'` `'unsafe-inline'` に加え `https://static.line-scdn.net` `https://liffsdk.line-scdn.net`
- `connect-src`: `'self'` と既存 Supabase に加え `https://api.line.me` `https://access.line.me` `https://liffsdk.line-scdn.net`

実装時にブラウザの CSP 違反が出たら、そのオリジンだけを `/liff` 用 CSP に追加する。アプリ本体の `buildAppCsp` には足さない。

## 8. ファイル配置

| 場所                                                                  | 役割                                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/line/`                                                       | 署名検証・JWT・トークン・LIFF URL・UA 判定など。`dx-sensor` から移植しテストも移植 |
| `src/lib/mail/build-line-friend-invite-email.ts`                      | 招待メール本文。HTML はエスケープ済み                                              |
| `src/features/line/`                                                  | `types.ts` / `queries.ts` / `actions.ts` / 管理画面コンポーネント                  |
| `src/app/api/line/`                                                   | webhook / friend-link-accept / liff-auth                                           |
| `src/app/liff/`                                                       | LIFF 画面                                                                          |
| `src/app/p/line-friend-invite/[token]/`                               | QR 公開ページ                                                                      |
| `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/` | テナント管理者                                                                     |
| `src/app/(saas-admin)/saas_adm/line/`                                 | SaaS 管理者                                                                        |
| `scripts/setup-line-rich-menu.mjs`                                    | リッチメニュー作成。名称は hr-dx 用に変更                                          |
| `supabase/migrations/`                                                | テーブル + RLS + service マスタ                                                    |

依存パッケージ: `jose`、`@line/liff`。テストは vitest ではなく既存の `node:test`（`npm test`）に合わせて移植する。

## 9. `dx-sensor` からの読み替え

| dx-sensor                                 | hr-dx-saas                                                            |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `tenant_members`                          | `employees`（`user_id`）                                              |
| `has_tenant_role(..., 'admin')`           | `current_employee_app_role() <> 'employee'`                           |
| `is_app_developer()`                      | `current_employee_app_role() = 'developer'`                           |
| `createServiceSupabase()`                 | `createAdminClient()`（Route Handler / 公開ページのトークン照合のみ） |
| `POST /api/tenant-members/friend-invites` | `features/line/actions.ts`                                            |
| Resend                                    | `sendMail`                                                            |
| `/line-friend-invite/[token]`             | `/p/line-friend-invite/[token]`                                       |
| ログイン後 `/`                            | `/top`                                                                |
| `/liff/link` と `invite-accept`           | 移植しない                                                            |
| `auth.admin.listUsers()` でメール解決     | `get_tenant_employee_auth_email`                                      |

## 10. エラーハンドリング

- API 失敗の詳細はサーバーログのみ。クライアントは理由コード（`token_invalid` / `expired` / `already_used` / `not_linked` / `session_failed`）
- Webhook 署名失敗は 401。body はログしない
- 招待メールの1件失敗は他の送信を止めない
- 他人に紐付いた LINE で QR を読むと拒否する。`used_at` を先に消費する既存の軽い DoS は、再発行で回復する（取り消し UI は作らない）

## 11. テスト

単体（`src/lib/line/*.test.ts`、`node:test`）:

- Webhook 署名検証
- ID トークン claims 検証
- 招待トークン生成・TTL
- LIFF URL が `https://liff.line.me/{id}/friend-link/{token}` であること（クエリだけだと `/liff` に落ちて 404 になる）
- `resolveLiffStatePath` が `/entry` と `/friend-link` 以外を拒否すること
- 招待メール HTML がテナント名をエスケープすること

統合（実装可能な範囲）:

- employee ロールは招待 Action を呼べない
- `friend-link-accept` が正しい `tenant_id` / `employee_id` / `user_id` で `linked` にする
- 別人へ紐付いた LINE は拒否する
- `liff-auth` は `employees` に無いとセッションを作らない

E2E（Playwright）は対象外。手動確認:

1. 管理画面から招待メール（ローカルは Inbucket）
2. `/p/line-friend-invite/[token]` の QR
3. 実機 LINE でスキャン → 紐付け完了
4. リッチメニュー相当の `/liff/entry` → `/top`
5. 期限切れ・使用済みリンクの文言

LINE Developers 側（実装後の運用。コードでは自動化しない）:

- Webhook URL: `https://<domain>/api/line/webhook`
- LIFF エンドポイント URL: `https://<domain>/liff`
- Add friend option: `Normal` または `Aggressive`（非フォロワーにだけプロンプト。既存フォロワーの `/liff/entry` には出ない）

## 12. 対象外

- LINE 経由の新規アカウント作成
- 従業員が `/top` から自分で連携する
- Push 通知
- テナント別公式アカウント
- リッチメニューの管理画面操作
- 招待の取り消し UI
- Resend
- 1 LINE が複数テナントに属するケース（`line_user_id` UNIQUE で禁止）

## 13. 実装順序

1. 依存パッケージと `.env.example`
2. マイグレーション（テーブル・RLS・service マスタ）
3. `src/lib/line/` とテスト
4. Webhook
5. 招待 Server Action とメール
6. QR 公開ページ
7. `friend-link-accept` と `/liff/friend-link`
8. `liff-auth` と `/liff/entry` / `/liff` ルータ
9. テナント管理画面・SaaS 管理画面
10. middleware / CSP / `APP_ROUTES`
11. リッチメニュー CLI
12. 型生成（`supabase gen types typescript --local > src/lib/supabase/types.ts`）と `npm run type-check`

ローカル DB は `supabase db reset` しない。マイグレーションは `supabase migration up` のみ。
