# LINE連携 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テナント管理者が既存従業員へ LINE 友だち招待メールを送り、従業員が QR で紐付けたあと、リッチメニュー（`/liff/entry`）からパスワード無しで `/top` を開けるようにする。

**Architecture:** `dx-sensor` の LINE 基盤を移植する。紐付け先は `tenant_members` ではなく `employees`。招待発行は Server Action（`features/line/`）。Webhook と LIFF 認証だけ `app/api/line/`（外部からの呼び出し）。メールは既存 `sendMail`。全テナント共用の1公式アカウント。

**Tech Stack:** Next.js 16 App Router、Supabase RLS、`jose`、`@line/liff`、既存 `qrcode.react` / `nodemailer`、`node:test`

**Spec:** `docs/superpowers/specs/2026-09-15-line-integration-design.md`  
**PRD:** `docs/implementation-plan-line-integration.md`

## Global Constraints

- `supabase db reset` / `DROP` / `TRUNCATE` 禁止。マイグレーションは `supabase migration up` のみ。
- エンドユーザー向け `features/line/actions.ts` で `createAdminClient()` 禁止。
- `employees` の認証ユーザー列は `user_id`（`auth_user_id` は存在しない）。
- RLS は `current_tenant_id()` と `current_employee_app_role()`。
- URL は `APP_ROUTES` のみ。日本語コメント。
- テストは vitest ではなく `node:test`（`npm test`）。`dx-sensor` の `describe/it/expect` を `test` + `assert` に変換する。
- `dx-sensor` の `.env.local` のシークレットをコピーしない。
- `/liff/link` と `invite-accept`（LINE からの新規ユーザー作成）は移植しない。
- `resolveLiffStatePath` の許可パスは `/entry` と `/friend-link` のみ（`/link` は拒否して `/liff/entry`）。
- LIFF ログイン後の遷移は常に `/top`。
- ローカル DB の既存データは消さない。

---

## File Structure Overview

**新規作成:**

- `src/lib/line/verifyWebhookSignature.ts` / `.test.ts`
- `src/lib/line/parseWebhookEvents.ts` / `.test.ts`
- `src/lib/line/validateIdTokenClaims.ts` / `.test.ts`
- `src/lib/line/verifyLineIdToken.ts`
- `src/lib/line/inviteToken.ts` / `.test.ts`
- `src/lib/line/friendLinkUrl.ts` / `.test.ts`
- `src/lib/line/friendInviteLiffUrl.ts` / `.test.ts`
- `src/lib/line/resolveLiffStatePath.ts` / `.test.ts`
- `src/lib/line/isLiffClientUserAgent.ts` / `.test.ts`
- `src/lib/line/ensureFriendship.ts` / `.test.ts`
- `src/lib/line/parseLiffBodies.ts` / `.test.ts`
- `src/lib/line/establishSupabaseSession.ts`
- `src/lib/mail/build-line-friend-invite-email.ts` / `.test.ts`
- `src/features/line/types.ts`
- `src/features/line/queries.ts`
- `src/features/line/actions.ts`
- `src/features/line/components/FriendInviteClient.tsx`
- `src/features/line/components/LineFriendInviteQr.tsx`
- `src/features/line/components/SaasLineDashboard.tsx`
- `src/app/api/line/webhook/route.ts`
- `src/app/api/line/friend-link-accept/route.ts`
- `src/app/api/line/liff-auth/route.ts`
- `src/app/liff/page.tsx` / `LiffRouterView.tsx`
- `src/app/liff/entry/page.tsx` / `LiffEntryView.tsx`
- `src/app/liff/friend-link/[token]/page.tsx` / `LiffFriendLinkView.tsx`
- `src/app/p/line-friend-invite/[token]/page.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/page.tsx` / `loading.tsx` / `error.tsx`
- `src/app/(saas-admin)/saas_adm/line/page.tsx` / `loading.tsx` / `error.tsx`
- `scripts/setup-line-rich-menu.mjs`
- `supabase/migrations/<timestamp>_line_friends_and_invites.sql`

**変更:**

- `package.json` — `jose`, `@line/liff`
- `.env.example` — LINE 用 4 変数
- `src/config/routes.ts` — PUBLIC / TENANT / SAAS / LIFF のパス
- `src/middleware.ts` — `/liff` と `/api/line/` を公開、LIFF 用 CSP
- `src/lib/security/headers.ts` — `isLiffPath` / `buildLiffCsp`
- `src/lib/supabase/types.ts` — `supabase gen types typescript --local` で再生成

**作らない:**

- `tenant_member_invites`
- `/liff/link` / `invite-accept`
- `resend` / `qrcode` パッケージ
- 従業員 `/top` の自己連携ボタン
- リッチメニュー管理画面

---

### Task 1: LINE 純粋関数と単体テスト（TDD）

**Files:**

- Create: `src/lib/line/` 配下の検証・トークン・URL ユーティリティと `*.test.ts`
- Create: `src/lib/mail/build-line-friend-invite-email.ts` / `.test.ts`

**Interfaces:**

- Consumes: なし
- Produces:
  - `verifyLineWebhookSignature({ rawBody, signatureHeader, channelSecret }): boolean`
  - `parseWebhookEvents(body: unknown): LineWebhookEvent[]`
  - `validateLineIdTokenClaims(claims, { channelId, nowSeconds }): { lineUserId: string }`
  - `generateInviteToken(): string`
  - `inviteExpiryDate(fromDate?: Date): Date`
  - `buildFriendLinkPath(inviteToken: string): string`
  - `buildFriendInviteLiffUrl(liffId: string, token: string): string`
  - `resolveLiffStatePath(liffState: string | null): string`
  - `isLiffClientUserAgent(userAgent: string | null): boolean`
  - `ensureFriendship(liff: FriendshipLiffClient): Promise<void>`
  - `parseFriendLinkAcceptBody(body: unknown): { idToken: string; inviteToken: string }`
  - `parseLiffAuthBody(body: unknown): { idToken: string }`
  - `buildFriendInviteEmail({ tenantName, inviteUrl }): { subject: string; html: string }`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/line/verifyWebhookSignature.test.ts`（`dx-sensor` 同名テストを `node:test` 化）:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { verifyLineWebhookSignature } from './verifyWebhookSignature'

const channelSecret = 'test-channel-secret'
const rawBody = '{"events":[]}'

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64')
}

test('verifyLineWebhookSignature: 正しい署名は true', () => {
  const signature = sign(rawBody, channelSecret)
  assert.equal(
    verifyLineWebhookSignature({ rawBody, signatureHeader: signature, channelSecret }),
    true
  )
})

test('verifyLineWebhookSignature: 秘密が違うと false', () => {
  const signature = sign(rawBody, 'wrong-secret')
  assert.equal(
    verifyLineWebhookSignature({ rawBody, signatureHeader: signature, channelSecret }),
    false
  )
})

test('verifyLineWebhookSignature: ヘッダー無しは false', () => {
  assert.equal(verifyLineWebhookSignature({ rawBody, signatureHeader: null, channelSecret }), false)
})

test('verifyLineWebhookSignature: body 改ざんは false', () => {
  const signature = sign(rawBody, channelSecret)
  assert.equal(
    verifyLineWebhookSignature({
      rawBody: '{"events":[{"type":"follow"}]}',
      signatureHeader: signature,
      channelSecret,
    }),
    false
  )
})
```

同じ要領で以下も `node:test` 化する（ソースは `dx-sensor/src/lib/line/*.test.ts`）。差分だけ守る:

- `validateIdTokenClaims.test.ts` — そのまま
- `inviteToken.test.ts` — そのまま（TTL は 72 時間、`2026-09-02T00:00:00.000Z` → `2026-09-05T00:00:00.000Z`）
- `parseWebhookEvents.test.ts` — そのまま
- `friendLinkUrl.test.ts` — そのまま
- `friendInviteLiffUrl.test.ts` — `buildFriendInviteLiffUrl` のみ（`generateFriendInviteQrDataUrl` は作らない）
- `resolveLiffStatePath.test.ts` — `/link` は `/liff/entry` にフォールバック（`/liff/link` へマッピングしない）
- `isLiffClientUserAgent.test.ts` — そのまま
- `ensureFriendship.test.ts` — `vi.fn()` の代わりに手動モック（呼び出したかを配列で記録）
- `parseLiffBodies.test.ts` — `dx-sensor` の `parseBody.test.ts` 2 本を統合
- `build-line-friend-invite-email.test.ts` — テナント名 `<script>` が HTML エスケープされること、`inviteUrl` が本文に含まれること

`resolveLiffStatePath` の `/link` ケース:

```typescript
test('resolveLiffStatePath: /link は未実装なので /liff/entry に落とす', () => {
  assert.equal(resolveLiffStatePath('/link'), '/liff/entry')
})
```

メール:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFriendInviteEmail } from './build-line-friend-invite-email'

test('buildFriendInviteEmail: 件名にテナント名を含む', () => {
  const { subject } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    inviteUrl: 'https://example.test/p/line-friend-invite/tok123',
  })
  assert.equal(subject.includes('サンプル商事'), true)
})

test('buildFriendInviteEmail: テナント名を HTML エスケープする', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: '<script>x</script>',
    inviteUrl: 'https://example.test/p/line-friend-invite/tok123',
  })
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('&lt;script&gt;'), true)
})
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

Run: `node --import tsx --test src/lib/line/verifyWebhookSignature.test.ts`

Expected: FAIL（モジュール未存在）

- [ ] **Step 3: 実装する**

`verifyWebhookSignature.ts` / `parseWebhookEvents.ts` / `validateIdTokenClaims.ts` / `inviteToken.ts` / `friendLinkUrl.ts` / `isLiffClientUserAgent.ts` / `ensureFriendship.ts` は `dx-sensor/src/lib/line/` からコピーし、引用符をプロジェクトの single quote に合わせる。

`friendInviteLiffUrl.ts`:

```typescript
export function buildFriendInviteLiffUrl(liffId: string, token: string): string {
  return `https://liff.line.me/${liffId}/friend-link/${encodeURIComponent(token)}`
}
```

`resolveLiffStatePath.ts`（許可は entry と friend-link のみ）:

```typescript
const ALLOWED_SUB_PATHS = ['/entry', '/friend-link']
const DEFAULT_PATH = '/liff/entry'

function matchesAllowedPath(state: string, allowed: string): boolean {
  return state === allowed || state.startsWith(`${allowed}/`)
}

export function resolveLiffStatePath(liffState: string | null): string {
  if (!liffState) return DEFAULT_PATH
  if (!liffState.startsWith('/') || liffState.startsWith('//')) return DEFAULT_PATH
  const isAllowed = ALLOWED_SUB_PATHS.some(allowed => matchesAllowedPath(liffState, allowed))
  if (!isAllowed) return DEFAULT_PATH
  return `/liff${liffState}`
}
```

`parseLiffBodies.ts` は `dx-sensor` の `parseFriendLinkAcceptBody` と `parseLiffAuthBody` を同じファイルに置く。

`verifyLineIdToken.ts` は `dx-sensor` からコピー。`jose` が未導入ならこのファイルの import は Task 2 まで残してよい。claims 検証単体は `validateLineIdTokenClaims` だけで通す。

`build-line-friend-invite-email.ts`:

```typescript
import { escapeHtml } from '@/lib/mail/send'

export function buildFriendInviteEmail(params: { tenantName: string; inviteUrl: string }): {
  subject: string
  html: string
} {
  const tenantName = escapeHtml(params.tenantName)
  const inviteUrl = escapeHtml(params.inviteUrl)
  return {
    subject: `【${params.tenantName}】LINE友だち追加のお願い`,
    html: [
      `<p>${tenantName}の管理者より、LINE公式アカウントの友だち追加をお願いします。</p>`,
      `<p>下記のリンクを開き、表示されるQRコードをLINEアプリで読み取ってください。</p>`,
      `<p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
      `<p>このリンクの有効期限は発行から72時間です。</p>`,
    ].join('\n'),
  }
}
```

件名のテナント名はメールヘッダーなので HTML エスケープしない（生テキスト）。本文だけ `escapeHtml`。

- [ ] **Step 4: テストを通す**

Run: `node --import tsx --test src/lib/line/*.test.ts src/lib/mail/build-line-friend-invite-email.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/line src/lib/mail/build-line-friend-invite-email.ts src/lib/mail/build-line-friend-invite-email.test.ts
git commit -m "$(cat <<'EOF'
feat: LINE連携の署名・トークン・LIFF URL ユーティリティを追加

EOF
)"
```

---

### Task 2: 依存パッケージと環境変数

**Files:**

- Modify: `package.json`
- Modify: `.env.example`（末尾に追記）
- Create: `src/lib/line/verifyLineIdToken.ts`（未作成なら）

**Interfaces:**

- Consumes: Task 1 の `validateLineIdTokenClaims`
- Produces: `verifyLineIdToken(idToken: string, channelId: string): Promise<{ lineUserId: string }>`

- [ ] **Step 1: パッケージを入れる**

Run: `npm install jose @line/liff`

`@line/liff` は Client Component からの動的 import 専用。`jose` はサーバー専用。

- [ ] **Step 2: `verifyLineIdToken.ts` を置く**

`dx-sensor/src/lib/line/verifyLineIdToken.ts` をコピー。`aud` には `LINE_LOGIN_CHANNEL_ID` を渡す（呼び出し側の責任。この関数の第2引数名は `channelId`）。

- [ ] **Step 3: `.env.example` に追記する**

```
# LINE連携（全テナント共用の公式アカウント + LIFF）
# LINE_LOGIN_CHANNEL_ID は JWT の aud（数値チャネルID）。NEXT_PUBLIC_LIFF_ID とは別物。
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_LOGIN_CHANNEL_ID=
NEXT_PUBLIC_LIFF_ID=
```

値は空のまま。`dx-sensor` の実シークレットを貼らない。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/line/verifyLineIdToken.ts
git commit -m "$(cat <<'EOF'
chore: LINE連携用の jose / @line/liff と環境変数プレースホルダを追加

EOF
)"
```

---

### Task 3: DBマイグレーション（テーブル・RLS・メニュー）

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_line_friends_and_invites.sql`  
  タイムスタンプは実行時の Asia/Tokyo。`ls supabase/migrations | tail` で既存より新しいことを確認する。

**Interfaces:**

- Consumes: 既存 `current_tenant_id()` / `current_employee_app_role()` / `moddatetime`
- Produces: `public.line_friends`, `public.line_friend_invites`、service 2 行

- [ ] **Step 1: マイグレーション SQL を書く**

`CREATE TABLE IF NOT EXISTS`。`DROP` は書かない。

`line_friends`:

```sql
CREATE TABLE IF NOT EXISTS public.line_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  status text NOT NULL DEFAULT 'unlinked'
    CHECK (status IN ('unlinked', 'linked', 'blocked')),
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS line_friends_linked_employee_idx
  ON public.line_friends (employee_id)
  WHERE status = 'linked' AND employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS line_friends_tenant_idx ON public.line_friends (tenant_id);
CREATE INDEX IF NOT EXISTS line_friends_user_idx ON public.line_friends (user_id);

ALTER TABLE public.line_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_friends_select ON public.line_friends
  FOR SELECT TO authenticated
  USING (
    public.current_employee_app_role() = 'developer'
    OR tenant_id = public.current_tenant_id()
  );

GRANT SELECT ON public.line_friends TO authenticated;

DROP TRIGGER IF EXISTS set_line_friends_updated_at ON public.line_friends;
CREATE TRIGGER set_line_friends_updated_at
  BEFORE UPDATE ON public.line_friends
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

COMMENT ON TABLE public.line_friends IS 'LINE公式アカウントの友だちと従業員の紐付け（全テナント共用OA）';
```

INSERT/UPDATE/DELETE の authenticated ポリシーは作らない。

`line_friend_invites`:

```sql
CREATE TABLE IF NOT EXISTS public.line_friend_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  invite_token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_friend_invites_tenant_idx
  ON public.line_friend_invites (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS line_friend_invites_token_idx
  ON public.line_friend_invites (invite_token);

ALTER TABLE public.line_friend_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_friend_invites_admin ON public.line_friend_invites
  FOR ALL TO authenticated
  USING (
    public.current_employee_app_role() = 'developer'
    OR (
      tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() <> 'employee'
    )
  )
  WITH CHECK (
    public.current_employee_app_role() = 'developer'
    OR (
      tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() <> 'employee'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_friend_invites TO authenticated;

COMMENT ON TABLE public.line_friend_invites IS '既存従業員向け LINE 友だち招待トークン';
```

メニュー登録は grant-notifier と同じ DO ブロック。固定 UUID:

- テナント: `a1c8e4d2-6b70-4f3a-9e21-5d84c0b17a52` / `route_path='/adm/line-friend-invites'`
- SaaS: `c3f0b9a7-2e15-4d88-b6c4-91a07e3d5f80` / `route_path='/saas_adm/line'`

カテゴリ解決:

- テナント: `public.service` の `trim(route_path)='/adm/settings'` の `service_category_id`。兄弟割当元も同じ行の `id`
- SaaS: `trim(route_path)='/saas_adm/hr-law-knowledge'` の `service_category_id`

`target_audience` はそれぞれ `'adm'` / `'saas_adm'`、`release_status='公開'`。  
`app_role_service` はテナント管理者向けに INSERT しない。  
`tenant_service` は `/adm/settings` が割当済みのテナントへコピー（`start_date` / `status` もコピー）。

- [ ] **Step 2: 適用する（reset しない）**

Run: `supabase migration up`

Expected: 新しいマイグレーションが Applied。エラーなら SQL を直して同じファイルを修正（適用前なら）。適用後に壊れた場合は新規マイグレーションで足す。`DROP TABLE` はしない。

- [ ] **Step 3: テーブルがあることを確認する**

Run:

```bash
psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "\d public.line_friends" -c "\d public.line_friend_invites"
```

Expected: 両テーブルと RLS が存在する。

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*line_friends_and_invites.sql
git commit -m "$(cat <<'EOF'
feat: LINE友だち紐付け用テーブルとメニューマスタを追加

EOF
)"
```

---

### Task 4: ルート定数・middleware・CSP

**Files:**

- Modify: `src/config/routes.ts`
- Modify: `src/lib/security/headers.ts`
- Modify: `src/middleware.ts`

**Interfaces:**

- Consumes: なし
- Produces:
  - `APP_ROUTES.PUBLIC.LINE_FRIEND_INVITE(token: string)` → `/p/line-friend-invite/${token}`
  - `APP_ROUTES.TENANT.ADMIN_LINE_FRIEND_INVITES` → `/adm/line-friend-invites`
  - `APP_ROUTES.SAAS.LINE` → `/saas_adm/line`
  - `APP_ROUTES.LIFF.ROOT` → `/liff`
  - `APP_ROUTES.LIFF.ENTRY` → `/liff/entry`
  - `APP_ROUTES.LIFF.FRIEND_LINK(token: string)` → `/liff/friend-link/${token}`
  - `isLiffPath(pathname: string): boolean`
  - `buildLiffCsp(isDev: boolean): string`

- [ ] **Step 1: `APP_ROUTES` を追加する**

`PUBLIC` に:

```typescript
LINE_FRIEND_INVITE: (token: string) => `/p/line-friend-invite/${token}`,
```

`TENANT` に `ADMIN_LINE_FRIEND_INVITES: '/adm/line-friend-invites'`  
`SAAS` に `LINE: '/saas_adm/line'`  
ルートオブジェクトに:

```typescript
LIFF: {
  ROOT: '/liff',
  ENTRY: '/liff/entry',
  FRIEND_LINK: (token: string) => `/liff/friend-link/${token}`,
},
```

- [ ] **Step 2: LIFF 用 CSP を追加する**

`src/lib/security/headers.ts` に定数と関数を追加。`buildAppCsp` は変更しない。`serializeDirectives` と `getSupabaseOrigins` を再利用する。

```typescript
const LINE_STATIC = 'https://static.line-scdn.net'
const LINE_LIFF_SDK = 'https://liffsdk.line-scdn.net'
const LINE_API = 'https://api.line.me'
const LINE_ACCESS = 'https://access.line.me'

export function isLiffPath(pathname: string): boolean {
  return pathname === '/liff' || pathname.startsWith('/liff/')
}

export function buildLiffCsp(isDev: boolean): string {
  // buildAppCsp と同じ directives テーブルを組み立て、
  // script-src に LINE_STATIC と LINE_LIFF_SDK、
  // connect-src に LINE_API, LINE_ACCESS, LINE_LIFF_SDK を足す。
  // アプリ全体の buildAppCsp には LINE オリジンを足さない。
}
```

- [ ] **Step 3: middleware を直す**

`src/middleware.ts`:

1. `isLiffPath` / `buildLiffCsp` を import
2. CSP 選択: SCORM → LIFF → アプリ本体
3. `const isLineApiRoute = pathname.startsWith('/api/line/')`
4. `isApiRoute` から `isLineApiRoute` を除外（未ログインでも JSON 401 にしない）
5. 未ログインのページリダイレクト条件に `!isLiffPath(pathname)` を足す（`/p/` は既存の `isPublicPortalPage`）

- [ ] **Step 4: Commit**

```bash
git add src/config/routes.ts src/lib/security/headers.ts src/middleware.ts
git commit -m "$(cat <<'EOF'
feat: LINE LIFF / Webhook を公開パスと専用 CSP にする

EOF
)"
```

---

### Task 5: Webhook

**Files:**

- Create: `src/app/api/line/webhook/route.ts`

**Interfaces:**

- Consumes: `verifyLineWebhookSignature`, `parseWebhookEvents`, `createAdminClient()`
- Produces: `POST /api/line/webhook` → `{ ok: true }` または 401/400/500

- [ ] **Step 1: ルートを実装する**

`dx-sensor/src/app/api/line/webhook/route.ts` を移植。差分:

- `createServiceSupabase()` → `createAdminClient()`
- `LINE_CHANNEL_SECRET` 未設定は 500
- 署名失敗は 401。raw body はログしない
- `follow`: 行が無ければ `unlinked` insert。`blocked` なら `user_id` 有無で `linked` / `unlinked`
- `unfollow`: `status='blocked'`
- `message` は無視

`createAdminClient()` は Route Handler なので可（エンドユーザー actions ではない）。

- [ ] **Step 2: 署名なしで 401 になることを確認する**

Run:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

Expected: `401`（dev server が動いている場合）。未起動なら実装の目視で署名分岐があることを確認。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/line/webhook/route.ts
git commit -m "$(cat <<'EOF'
feat: LINE Webhook で follow/unfollow を line_friends に反映する

EOF
)"
```

---

### Task 6: 招待 Server Action と候補クエリ

**Files:**

- Create: `src/features/line/types.ts`
- Create: `src/features/line/queries.ts`
- Create: `src/features/line/actions.ts`

**Interfaces:**

- Consumes: `generateInviteToken`, `inviteExpiryDate`, `buildFriendInviteEmail`, `sendMail`, `get_tenant_employee_auth_email`, `APP_ROUTES.PUBLIC.LINE_FRIEND_INVITE`
- Produces:
  - `FriendInviteCandidate { employeeId, userId, name, email }`
  - `listFriendInviteCandidates(): Promise<FriendInviteCandidate[]>`
  - `sendFriendInvites(employeeIds: string[]): Promise<{ sent: number; failed: { employeeId: string; name: string; reason: string }[] }>`
  - `getLineLinkStats(): Promise<{ linked: number; unlinked: number; blocked: number }>`（SaaS 用。developer RLS）

- [ ] **Step 1: 型と queries を書く**

`queries.ts` は `createClient()` のみ。`page.tsx` から呼ぶ。

候補:

1. `employees` を自テナントで `user_id` IS NOT NULL
2. `line_friends` の `status='linked'` の `employee_id` / `user_id` を除外
3. 各 `user_id` に `rpc('get_tenant_employee_auth_email', { p_tenant_id, p_user_id })`
4. メールが取れない人は候補に残し `email: ''`（送信時に失敗として返す）

SaaS 件数: `line_friends` を select し status ごとに count。developer 以外なら throw。

- [ ] **Step 2: actions を書く**

```typescript
'use server'

export async function sendFriendInvites(employeeIds: string[]) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (user.appRole === 'employee') throw new Error('Forbidden')
  if (!user.tenant_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  // 対象 employees を tenant_id + id in employeeIds + user_id not null で取得
  // 1件ずつ: invite insert（RLS）→ メール解決 → sendMail
  // insert 成功・メール失敗は failed に積み、他は続ける
}
```

`createAdminClient()` は使わない。  
origin は `process.env.NEXT_PUBLIC_APP_URL`（末尾スラッシュ無し）+ `APP_ROUTES.PUBLIC.LINE_FRIEND_INVITE(token)`。  
`created_by` は `user.id`。  
`expires_at` は `inviteExpiryDate().toISOString()`。  
`revalidatePath(APP_ROUTES.TENANT.ADMIN_LINE_FRIEND_INVITES)`。

- [ ] **Step 3: Commit**

```bash
git add src/features/line/types.ts src/features/line/queries.ts src/features/line/actions.ts
git commit -m "$(cat <<'EOF'
feat: LINE友だち招待の候補取得とメール送信 Action を追加

EOF
)"
```

---

### Task 7: 公開 QR ページ

**Files:**

- Create: `src/app/p/line-friend-invite/[token]/page.tsx`
- Create: `src/features/line/components/LineFriendInviteQr.tsx`

**Interfaces:**

- Consumes: `buildFriendInviteLiffUrl`, `createAdminClient()`, `APP_ROUTES`
- Produces: `/p/line-friend-invite/[token]`

- [ ] **Step 1: QR Client を書く**

```tsx
'use client'
import { QRCodeSVG } from 'qrcode.react'

export function LineFriendInviteQr({ url }: { url: string }) {
  return <QRCodeSVG value={url} size={320} includeMargin className="mx-auto" />
}
```

- [ ] **Step 2: 公開 page を書く**

- `export const dynamic = 'force-dynamic'`
- `params: Promise<{ token: string }>` を `await`
- `createAdminClient()` で `line_friend_invites` を `invite_token` 照合（未ログインのため RLS 外）
- 無効 / `used_at` あり / 期限切れで日本語メッセージを分ける
- `NEXT_PUBLIC_LIFF_ID` が無ければ「現在この機能はご利用いただけません。」
- 有効なら `buildFriendInviteLiffUrl(liffId, token)` を `LineFriendInviteQr` に渡す
- 説明文: 「LINEアプリのカメラ（またはQRコードリーダー）で、下のQRコードを読み取ってください。」

- [ ] **Step 3: Commit**

```bash
git add src/app/p/line-friend-invite src/features/line/components/LineFriendInviteQr.tsx
git commit -m "$(cat <<'EOF'
feat: LINE友だち招待の公開 QR ページを追加

EOF
)"
```

---

### Task 8: friend-link-accept と LIFF 紐付け画面

**Files:**

- Create: `src/app/api/line/friend-link-accept/route.ts`
- Create: `src/app/liff/friend-link/[token]/page.tsx`
- Create: `src/app/liff/friend-link/[token]/LiffFriendLinkView.tsx`

**Interfaces:**

- Consumes: `parseFriendLinkAcceptBody`, `verifyLineIdToken`, `ensureFriendship`, `createAdminClient()`
- Produces: `POST /api/line/friend-link-accept`、`/liff/friend-link/[token]`

- [ ] **Step 1: accept ルートを実装する**

`dx-sensor` の `friend-link-accept/route.ts` を移植し、次を必ず変える:

1. 招待 select は `id, tenant_id, employee_id, expires_at, used_at`
2. 期限・使用済みチェックのあと、`.is('used_at', null)` で `used_at` を原子的 update。0 件なら `already_used`
3. `employees` を `id = invite.employee_id` かつ `tenant_id = invite.tenant_id` で取得。`user_id` が無ければ `token_invalid`
4. 既存 `line_friends` を `line_user_id` で探す。`user_id` があり invite の従業員 `user_id` と違う → `token_invalid`
5. upsert `onConflict: 'line_user_id'`:
   - `line_user_id`, `user_id`, `employee_id`, `tenant_id`, `status: 'linked'`, `linked_at`
6. 同一従業員への再リンクは成功（冪等）
7. クライアントへ返すエラーは `token_invalid` / `expired` / `already_used` / `link_failed` のみ
8. `LINE_LOGIN_CHANNEL_ID` で ID トークン検証

- [ ] **Step 2: LIFF 画面を実装する**

`LiffFriendLinkView` は `dx-sensor` から移植。差分:

- 完了文: 「連携が完了しました。今後はLINEのリッチメニューからHR-DXにアクセスできます。」（dx-sensor 表記にしない）
- `fetch('/api/line/friend-link-accept', ...)`
- `ensureFriendship(liff)` を login 後・getIDToken 前に呼ぶ
- `params` は Promise。page は token を Client に渡すだけ

page.tsx は layout 無しの独立ルート。認証ガードをかけない。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/line/friend-link-accept src/app/liff/friend-link
git commit -m "$(cat <<'EOF'
feat: LINE友だち紐付け API と LIFF 完了画面を追加

EOF
)"
```

---

### Task 9: liff-auth・自動ログイン・LIFF ルータ

**Files:**

- Create: `src/lib/line/establishSupabaseSession.ts`
- Create: `src/app/api/line/liff-auth/route.ts`
- Create: `src/app/liff/entry/page.tsx` / `LiffEntryView.tsx`
- Create: `src/app/liff/page.tsx` / `LiffRouterView.tsx`

**Interfaces:**

- Consumes: `verifyLineIdToken`, `parseLiffAuthBody`, `resolveLiffStatePath`, `createAdminClient()`, `createClient()`
- Produces: `establishSupabaseSession({ adminClient, sessionClient, email })`, `POST /api/line/liff-auth`, `/liff`, `/liff/entry`

- [ ] **Step 1: セッション確立を移植する**

`dx-sensor/src/lib/line/establishSupabaseSession.ts` をコピー。  
`adminClient` は `createAdminClient()`（`auth.admin.generateLink`）。  
`sessionClient` は `await createClient()`（Cookie 付き `verifyOtp`）。

- [ ] **Step 2: liff-auth ルートを実装する**

`dx-sensor` の `liff-auth/route.ts` を移植。差分:

- `tenant_members` 照会をやめる
- `line_friends` が `status==='linked'` かつ `user_id` / `tenant_id` あり
- `employees` を `.eq('tenant_id', friend.tenant_id).eq('user_id', friend.user_id).maybeSingle()`。無ければ `not_linked`
- `auth.admin.getUserById` で email。無ければ `not_linked`
- `establishSupabaseSession` 失敗は `session_failed`
- 成功 `{ ok: true }`（Set-Cookie は sessionClient 経由）

- [ ] **Step 3: `/liff/entry` と `/liff` を実装する**

`LiffEntryView`: `dx-sensor` から移植。成功時は `APP_ROUTES.TENANT.PORTAL`（`/top`）へ `window.location.assign`。

未連携メッセージ: 「まだアカウントが連携されていません。」「管理者から送られた招待メールのリンクからアクセスしてください。」

`LiffRouterView`: `resolveLiffStatePath` の結果へ `router.replace`。

- [ ] **Step 4: Commit**

```bash
git add src/lib/line/establishSupabaseSession.ts src/app/api/line/liff-auth src/app/liff/entry src/app/liff/page.tsx src/app/liff/LiffRouterView.tsx
git commit -m "$(cat <<'EOF'
feat: LINE LIFF からの自動ログインを /top へ接続する

EOF
)"
```

---

### Task 10: テナント管理者画面と SaaS 管理者画面

**Files:**

- Create: `src/features/line/components/FriendInviteClient.tsx`
- Create: `src/features/line/components/SaasLineDashboard.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/page.tsx` / `loading.tsx` / `error.tsx`
- Create: `src/app/(saas-admin)/saas_adm/line/page.tsx` / `loading.tsx` / `error.tsx`

**Interfaces:**

- Consumes: `listFriendInviteCandidates`, `sendFriendInvites`, `getLineLinkStats`
- Produces: `/adm/line-friend-invites`, `/saas_adm/line`

- [ ] **Step 1: テナント管理者 UI**

ルート `div` はパターン B:

```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
```

`w-full` を `mx-auto` より先に付ける。

- `TenantBackLink`
- メインカード: タイトル「LINE友だち招待」、説明「まだLINE公式アカウントを友だち追加していない従業員に、招待メールを送信します。」
- `DataTable` `selectable`。`getRowId` は `employeeId`。列は氏名・メール
- 選択後ボタン「招待メールを送信」→ `sendFriendInvites([...selectedIds])`
- 部分成功の件数と失敗理由をカード内に表示
- `docs/ui/admin-card-and-table.md` に合わせる（カード `rounded-lg border ... p-5`、テーブルは `DataTable`）

`page.tsx` は `getServerUser()` のあと `listFriendInviteCandidates()` を呼び Client に渡す。`supabase.from` は page に書かない。

admin layout が employee を弾くので page 側のロール分岐は不要。

- [ ] **Step 2: SaaS 管理者 UI**

- `getLineLinkStats()` で件数
- 環境変数は boolean のみ表示（`Boolean(process.env.LINE_CHANNEL_SECRET)` 等）。値は描画しない。page の Server Component で flags を作って Client に渡す
- リッチメニューは「CLI `scripts/setup-line-rich-menu.mjs` で設定」と書くだけ。実行ボタンは置かない
- layout が developer / supaUser をガードする

- [ ] **Step 3: loading / error**

`announcements/loading.tsx` / `error.tsx` をコピーし文言だけ「LINE連携」に変える。

- [ ] **Step 4: Commit**

```bash
git add src/features/line/components src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites src/app/(saas-admin)/saas_adm/line
git commit -m "$(cat <<'EOF'
feat: LINE友だち招待と接続状態の管理画面を追加

EOF
)"
```

---

### Task 11: リッチメニュー CLI・型生成・型チェック

**Files:**

- Create: `scripts/setup-line-rich-menu.mjs`
- Modify: `src/lib/supabase/types.ts`（生成結果）

**Interfaces:**

- Consumes: `LINE_CHANNEL_ACCESS_TOKEN`, `NEXT_PUBLIC_LIFF_ID`
- Produces: Messaging API でデフォルトリッチメニューを作成する CLI

- [ ] **Step 1: スクリプトを移植する**

`dx-sensor/scripts/setup-line-rich-menu.mjs` をコピー。変更点:

- `name: "hr-dx default menu"`
- `chatBarText: "メニュー"`
- URI は `https://liff.line.me/${liffId}`（パス無し。`/liff` ルータが entry へ振る）
- 使い方コメントを hr-dx-saas 用にする

この Task では実行しない（画像ファイルと本番トークンが要る）。ファイルを置くだけ。

- [ ] **Step 2: 型を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`

Expected: `line_friends` / `line_friend_invites` が型に含まれる。

- [ ] **Step 3: 型チェックとテスト**

Run: `npm run type-check`  
Run: `npm test`

Expected: 新規ファイル由来のエラーなし。既存失敗があれば LINE 追加分だけ直す。

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-line-rich-menu.mjs src/lib/supabase/types.ts
git commit -m "$(cat <<'EOF'
feat: LINEリッチメニュー CLI と Supabase 型を更新する

EOF
)"
```

---

## 手動確認（実装後・Playwright 対象外）

1. `/adm/line-friend-invites` から招待 → Inbucket でメール
2. `/p/line-friend-invite/[token]` の QR
3. 実機 LINE でスキャン → 紐付け完了メッセージ
4. `/liff/entry` → `/top`
5. 期限切れ・使用済みリンクの文言
6. 別人に紐付いた LINE で QR を読むと拒否

LINE Developers（コード外）:

- Webhook: `https://<domain>/api/line/webhook`
- LIFF エンドポイント URL: `https://<domain>/liff`（個別の `/liff/entry` ではない）
- Add friend option: `Normal` または `Aggressive`

## Spec coverage

| 設計書                           | Task                          |
| -------------------------------- | ----------------------------- |
| 4 データモデル / RLS             | 3                             |
| 5.1 テナント管理者画面           | 10                            |
| 5.2 SaaS 画面                    | 10                            |
| 5.3 公開 QR                      | 7                             |
| 5.4 LIFF                         | 8, 9                          |
| 6.1 Webhook / accept / liff-auth | 5, 8, 9                       |
| 6.2 Server Action                | 6                             |
| 6.3 ID トークン                  | 1, 2                          |
| 6.4 env                          | 2                             |
| 7 CSP                            | 4                             |
| 11 単体テスト                    | 1                             |
| リッチメニュー CLI               | 11                            |
| 対象外（invite-accept 等）       | File Structure の「作らない」 |
