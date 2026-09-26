# ログイン2画面分離（app / myou）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app.hr-dx.jp/login` は MYOU テナント（`MYOU_PUBLIC_TENANT_ID` / `MYOU_LOCAL_TENANT_ID`）のユーザーを拒否し、`myou.hr-dx.jp`（入口は `/login-myou`）は MYOU テナントのユーザーのみ受け入れる。

**Architecture:** 認証は共通の `signInAction` を使い、引数 `audience: 'default' | 'myou'` で「許可テナント判定」を追加する。判定は純粋関数（`src/lib/auth/tenant-audience.ts`）に切り出しテスト可能にする。不許可なら `signOut()` してセッションを破棄しエラーを返す（リダイレクト前に判定）。`myou.hr-dx.jp` のホストで未ログインの場合、middleware が `/` と `/login`（および保護ページからの未認証リダイレクト）を `/login-myou` へ redirect する（正規 URL は `https://myou.hr-dx.jp/login-myou`）。`/login-myou` の左パネルは `(auth)/layout.tsx` を使わず専用レイアウトで `login.png` を中央表示する。

**Tech Stack:** Next.js 16 App Router / Supabase Auth / node:test（`npm test` = `node --import tsx --test "src/**/*.test.ts"`）

**Spec:** 本メッセージのユーザー依頼（ログイン画面1・2の要件）

## Global Constraints

- `MYOU_PUBLIC_TENANT_ID` / `MYOU_LOCAL_TENANT_ID` は既に `.env.local` に定義済み（サーバー専用。`NEXT_PUBLIC_` を付けない）
- コメントは日本語、URL は `APP_ROUTES`（`src/config/routes.ts`）経由
- `createAdminClient()` は `actions.ts` で使わない
- デザインは HR-DX Design System 優先（`.claude/rules/design-override.md`）。ただし `/login-myou` は既存 `/login` をベースにするため、既存クラスを踏襲
- 本番 DB への DDL/DML は無し（本計画は DB 変更なし）
- main へ直接コミットしない。feature ブランチ（例 `feature/login-myou`）で作業

## 前提確認・要判断事項（実装前にユーザーへ確認）

1. **【確定】** 元画像 `docs/mYou/img/login.png`（106×419px）は解像度が低いため、周囲に余白を足した 800×1600px 版を採用済み。背景色は元画像と同じ `#fdfdfd`（不透過）。作成済みファイル：`public/myou/login.webp`（WebP、約 28KB）、原本 `docs/mYou/img/login-padded-800x1600.png`。左パネルの背景色もこの `#fdfdfd` に合わせる。
2. **Vercel に `myou.hr-dx.jp` ドメイン追加＋DNS（CNAME）＋環境変数 `MYOU_PUBLIC_TENANT_ID` / `MYOU_LOCAL_TENANT_ID` の本番登録**が別途必要（コード外作業）。
3. `myou.hr-dx.jp` でログイン後のセッション Cookie は**ホスト別**（app と共有されない）。これは意図通りか確認（推奨: 共有しない）。
4. `myou.hr-dx.jp` の `/login` 以外のパス（`/top` 等）は現状 app と同じアプリが返る。MYOU ユーザー以外が myou ドメインの他ページを見られるかは今回スコープ外（ログイン後は認証済みなので通常運用）。必要なら別計画。
5. Server Actions の `allowedOrigins` に `https://myou.hr-dx.jp` の追加が必須（Task 4）。
6. **【確定】** MYOU は LINE 連携を使わない。MYOU テナントの LINE 友だち招待・紐付け・LINE 経由ログインをサーバー側で無効化する（Task 3c）。LIFF は共用のまま変更しない。
7. **【確定】** MYOU ユーザーと app ユーザーは、別 PC・別メールアドレスの別人。同一人物が両ドメインを使うことはない。
8. ローカル検証は `http://myou.localhost:3000`（Chrome は `*.localhost` を 127.0.0.1 に解決するため hosts 編集不要）と `http://localhost:3000` で行う。

## Review Focus

- MYOU ユーザーが app 側で「メール/パスワード誤り」ではなく明確な拒否メッセージを受け、**セッションが残らない**こと（signOut 漏れ＝認証済みで /top に入れてしまう）
- 非 MYOU ユーザーが myou 側でログイン試行 → 拒否＆セッション破棄
- `tenant_id` が取得できない（employees 未紐付け／user_metadata のみ）ユーザーの扱い（app 側は従来通り、myou 側は拒否）
- 環境変数が未設定のとき myou 側は全員拒否（fail closed）、app 側は従来通り動く
- ホスト名判定：`myou.hr-dx.jp:443`、大文字、`www` 等の揺れ
- **ログイン画面以外でセッションが作られる経路が素通りしないこと**（再確認で判明。詳細は Task 3b）：`/login-stitches`（`signInWithPassword` をクライアントから直接呼ぶ）、`api/auth/callback`（メールリンクの `exchangeCodeForSession`）、LINE の `establishSupabaseSession`（マジックリンク）、およびブラウザから Supabase Auth を直接呼ぶ操作。`signInAction` の判定だけでは防げない
- `/login-myou` `/forgot-password-myou` `/reset-password-myou` を **app ドメインで開いた場合**、および `/login` `/forgot-password` `/reset-password` を **myou ドメインで開いた場合**に、相手側の画面が表示されないこと
- LINE：MYOU テナントで招待の作成・招待 QR の表示・紐付け・LINE 経由のセッション確立の**どれも**成立しないこと（UI を隠すだけでなくサーバー側で拒否）。既存の招待トークンが残っていても QR が出ないこと。app 側テナントの LINE 連携は従来どおり動くこと
- **`audience` はクライアントが渡す値**であり信用しない：`signInAction` / `resetPasswordAction` がサーバー側で Host ヘッダーと照合し、不一致なら**セッション作成前に**拒否すること
- myou ドメインから `/signup`（新規テナント作成）に入れないこと
- 【許容する残余リスク】テナントの特定に失敗した場合（`employees` 照会エラーかつ `user_metadata.tenant_id` なし）、app ドメイン側の判定は保留（従来動作）になる。MYOU ユーザーは通常 `employees` 行を持つため実害は想定しにくい。myou ドメイン側はテナント不明を拒否（fail closed）
- Cookie は `domain` 未指定のためホスト別（確認済み）。`app.hr-dx.jp` のセッションは `myou.hr-dx.jp` に送られず、逆も同様
- middleware の認証済みユーザーの `/login` アクセス→`/top` リダイレクトが myou でも動く（`isAuthPage` は `startsWith('/login')` なので `/login-myou` も該当）

## File Structure

| ファイル                                                      | 責務                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/auth/tenant-audience.ts`（新規）                     | `LoginAudience` 型、`isTenantAllowedForAudience()`、`getMyouTenantIds()` |
| `src/lib/auth/tenant-audience.test.ts`（新規）                | 上記の単体テスト                                                         |
| `src/lib/auth/actions.ts`（変更）                             | `signInAction(email, password, audience = 'default')` にテナント判定追加 |
| `src/lib/supabase/middleware.ts`／`src/middleware.ts`（変更） | myou ホストの `/`・`/login` → `/login-myou` redirect                     |
| `src/lib/auth/host.ts`（新規）＋テスト                        | `isMyouHost(host)` 純粋関数                                              |
| `src/config/routes.ts`（変更）                                | `AUTH.LOGIN_MYOU: '/login-myou'` 追加                                    |
| `src/app/(auth-myou)/login-myou/layout.tsx`（新規）           | 専用レイアウト（左：画像中央、右：フォーム）。3 画面共通で使用           |
| `src/app/(auth-myou)/login-myou/page.tsx`（新規）             | `/login` の複製（audience='myou'）                                       |
| `src/app/(auth-myou)/forgot-password-myou/page.tsx`（新規）   | `/forgot-password` の複製（Task 5b）                                     |
| `src/app/(auth-myou)/reset-password-myou/page.tsx`（新規）    | `/reset-password` の複製（Task 5b）                                      |
| `public/myou/login.webp`（作成済み）                          | 余白付き 800×1600px の左パネル画像（WebP）                               |
| `next.config.ts`（変更）                                      | `allowedOrigins` に `https://myou.hr-dx.jp`                              |
| `src/app/(auth)/login/page.tsx`（変更なし）                   | `signInAction` 既定引数が 'default' のため無変更                         |

> 注: `(auth)/layout.tsx` は左パネル `ShaderWaveCanvas` を固定で持つ。`login-myou` を同じ route group 内に置くと親レイアウトが適用されるため、**`(auth)` の外**（例 `src/app/(auth-myou)/login-myou/`）に置くか、`(auth)/layout.tsx` でパス分岐する。本計画は衝突が少ない **`src/app/(auth-myou)/login-myou/`** に置く（Task 5 のパスはこれに従う）。

---

**実行順:** Task 1 → Task 3 → Task 2 → Task 3b → Task 3c → Task 4 → Task 5 → Task 5b → Task 6 → Task 7（Task 2 が Task 3 の `host.ts` を使うため、番号順ではなくこの順で実行する）

### Task 1: 判定ロジック（純粋関数）

**Files:**

- Create: `src/lib/auth/tenant-audience.ts`
- Test: `src/lib/auth/tenant-audience.test.ts`

**Interfaces:**

- Produces:
  - `type LoginAudience = 'default' | 'myou'`
  - `getMyouTenantIds(env?: Record<string, string | undefined>): string[]`
  - `isTenantAllowedForAudience(audience: LoginAudience, tenantId: string | null | undefined, myouTenantIds: string[]): boolean`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMyouTenantIds, isTenantAllowedForAudience } from './tenant-audience'

const IDS = ['tenant-public', 'tenant-local']

test('default: MYOU テナントは拒否', () => {
  assert.equal(isTenantAllowedForAudience('default', 'tenant-public', IDS), false)
  assert.equal(isTenantAllowedForAudience('default', 'tenant-local', IDS), false)
})
test('default: 他テナントと tenant 不明は許可（従来動作）', () => {
  assert.equal(isTenantAllowedForAudience('default', 'other', IDS), true)
  assert.equal(isTenantAllowedForAudience('default', null, IDS), true)
})
test('myou: MYOU テナントのみ許可', () => {
  assert.equal(isTenantAllowedForAudience('myou', 'tenant-local', IDS), true)
  assert.equal(isTenantAllowedForAudience('myou', 'other', IDS), false)
})
test('myou: tenant 不明は拒否', () => {
  assert.equal(isTenantAllowedForAudience('myou', null, IDS), false)
  assert.equal(isTenantAllowedForAudience('myou', undefined, IDS), false)
})
test('myou: 環境変数未設定（空配列）は全員拒否 / default は全員許可', () => {
  assert.equal(isTenantAllowedForAudience('myou', 'x', []), false)
  assert.equal(isTenantAllowedForAudience('default', 'x', []), true)
})
test('getMyouTenantIds: 空文字・未設定を除外、前後空白を除去', () => {
  assert.deepEqual(getMyouTenantIds({ MYOU_PUBLIC_TENANT_ID: ' a ', MYOU_LOCAL_TENANT_ID: '' }), [
    'a',
  ])
  assert.deepEqual(getMyouTenantIds({}), [])
})
```

- [ ] **Step 2: 失敗確認** — Run: `node --import tsx --test src/lib/auth/tenant-audience.test.ts` / Expected: FAIL（モジュール無し）

- [ ] **Step 3: 実装**

```ts
/** ログイン画面の種別。default = app.hr-dx.jp/login、myou = myou.hr-dx.jp/login-myou */
export type LoginAudience = 'default' | 'myou'

/** 環境変数から MYOU 系テナント ID 一覧を取得（未設定・空は除外） */
export function getMyouTenantIds(env: Record<string, string | undefined> = process.env): string[] {
  return [env.MYOU_PUBLIC_TENANT_ID, env.MYOU_LOCAL_TENANT_ID]
    .map(v => v?.trim())
    .filter((v): v is string => !!v)
}

/** 画面種別ごとのログイン可否。myou 側は fail closed（不明・未設定は拒否） */
export function isTenantAllowedForAudience(
  audience: LoginAudience,
  tenantId: string | null | undefined,
  myouTenantIds: string[]
): boolean {
  const isMyou = !!tenantId && myouTenantIds.includes(tenantId)
  return audience === 'myou' ? isMyou : !isMyou
}
```

- [ ] **Step 4: 通過確認** — 同コマンド / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/lib/auth/tenant-audience*.ts && git commit -m "feat: ログイン画面種別ごとのテナント許可判定を追加"`

---

### Task 2: signInAction にテナント判定を組み込む

**Files:**

- Modify: `src/lib/auth/actions.ts:11-66`

**Interfaces:**

- Consumes: Task 1 の `LoginAudience`, `getMyouTenantIds`, `isTenantAllowedForAudience`、Task 3 の `isHostAudienceConsistent`
- Produces: `signInAction(email: string, password: string, audience: LoginAudience = 'default')`（不許可時 `{ success: false, error }`）

- [ ] **Step 1: 実装**（Server Action は Supabase 依存のため単体テストは Task 1 の純粋関数で担保。ここは手動検証 Task 7）

`actions.ts` 冒頭に import 追加、シグネチャ変更、tenant_id 確定後・`writeAuditLog` の前に挿入:

```ts
import {
  getMyouTenantIds,
  isTenantAllowedForAudience,
  type LoginAudience,
} from './tenant-audience';

export async function signInAction(
  email: string,
  password: string,
  audience: LoginAudience = 'default'
) {
```

```ts
// 画面種別とテナントの整合チェック（不許可ならセッションを破棄して拒否）
if (!isTenantAllowedForAudience(audience, tenant_id, getMyouTenantIds())) {
  await supabase.auth.signOut()
  return {
    success: false,
    error:
      audience === 'myou'
        ? 'このアカウントはこのログイン画面からはご利用いただけません。'
        : 'このアカウントはこのログイン画面からはご利用いただけません。お客様専用のログイン画面（https://myou.hr-dx.jp）からログインしてください。',
  }
}
```

**加えて、`signInWithPassword` を呼ぶ前**に、クライアントが渡す `audience` と実際の Host ヘッダーの一致をサーバー側で検証する（不一致ならセッションを作らずに拒否。`/login-myou` を app ドメイン上で使う、`audience` を偽装して呼ぶ、といった経路を入口で止める）:

```ts
import { headers } from 'next/headers';
import { isHostAudienceConsistent } from './host';

const host = (await headers()).get('host');
if (!isHostAudienceConsistent(host, audience)) {
  return { success: false, error: 'このログイン画面からはご利用いただけません。' };
}
```

配置位置（テナント判定）：`if (employee) {...}` ブロックの直後（`const session` より前）。また `writeAuditLog` の `path` を `audience === 'myou' ? '/login-myou' : '/login'` にする。

- [ ] **Step 2:** `npm run type-check` / Expected: エラー無し
- [ ] **Step 3: Commit** — `git commit -am "feat: signInAction に画面種別ごとのテナント判定を追加"`

---

### Task 3: ホスト判定＋middleware redirect

**Files:**

- Create: `src/lib/auth/host.ts`, `src/lib/auth/host.test.ts`
- Modify: `src/middleware.ts`（`updateSession` 後、認証ページ判定の前）、`src/config/routes.ts:20-25`

**Interfaces:**

- Produces: `isMyouHost(host: string | null | undefined): boolean`, `APP_ROUTES.AUTH.LOGIN_MYOU = '/login-myou'`

- [ ] **Step 1: テスト**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isHostAudienceConsistent, isMyouHost } from './host'

test('myou.hr-dx.jp を判定（ポート・大文字を許容）', () => {
  assert.equal(isMyouHost('myou.hr-dx.jp'), true)
  assert.equal(isMyouHost('MYOU.hr-dx.jp:443'), true)
})
test('ローカル検証用 myou.localhost を判定', () => {
  assert.equal(isMyouHost('myou.localhost:3000'), true)
})
test('ホストと audience の整合（サーバー側で Host ヘッダーを検証する）', () => {
  assert.equal(isHostAudienceConsistent('myou.hr-dx.jp', 'myou'), true)
  assert.equal(isHostAudienceConsistent('app.hr-dx.jp', 'default'), true)
  assert.equal(isHostAudienceConsistent('app.hr-dx.jp', 'myou'), false)
  assert.equal(isHostAudienceConsistent('myou.hr-dx.jp', 'default'), false)
  assert.equal(isHostAudienceConsistent(null, 'myou'), false)
})
test('app / localhost / null は false', () => {
  assert.equal(isMyouHost('app.hr-dx.jp'), false)
  assert.equal(isMyouHost('evil-myou.hr-dx.jp'), false)
  assert.equal(isMyouHost('myou.hr-dx.jp.evil.com'), false)
  assert.equal(isMyouHost('localhost:3000'), false)
  assert.equal(isMyouHost(null), false)
})
```

- [ ] **Step 2:** 失敗確認 → **Step 3:** 実装

```ts
/** MYOU 用ホスト名（完全一致のみ）。myou.localhost はローカル検証用（Chrome は *.localhost を 127.0.0.1 に解決する） */
const MYOU_HOSTS = ['myou.hr-dx.jp', 'myou.localhost']

/** myou.hr-dx.jp（ポート・大文字は無視）かどうか */
export function isMyouHost(host: string | null | undefined): boolean {
  return !!host && MYOU_HOSTS.includes(host.toLowerCase().split(':')[0])
}

/** 画面種別（audience）と実際のホストが一致しているか。クライアントが渡す audience を鵜呑みにしないために使う */
export function isHostAudienceConsistent(
  host: string | null | undefined,
  audience: LoginAudience
): boolean {
  return isMyouHost(host) === (audience === 'myou')
}
```

（`host.ts` の先頭に `import type { LoginAudience } from './tenant-audience'` を追加。）

- [ ] **Step 4: 画面の振り分けを純粋関数にする**（`src/lib/auth/host.ts` に追加。**両方向**の振り分けで、相手ドメインの画面を表示させない）。先にテスト:

```ts
import { resolveHostRedirect } from './host'

test('myou ホスト：未ログインの入口・app 用の認証画面を myou 用へ', () => {
  assert.equal(resolveHostRedirect('/', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/login', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/login/', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/forgot-password', true, false), '/forgot-password-myou')
  assert.equal(resolveHostRedirect('/reset-password', true, true), '/reset-password-myou')
  // myou ドメインからは新規サインアップ（別テナントの作成）に入れない
  assert.equal(resolveHostRedirect('/signup', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/signup/complete', true, false), '/login-myou')
})
test('myou ホスト：ログイン済みの / と /login は既存処理（/top へ）に任せる', () => {
  assert.equal(resolveHostRedirect('/', true, true), null)
  assert.equal(resolveHostRedirect('/login', true, true), null)
})
test('app ホスト：myou 専用画面は app 用へ戻す', () => {
  assert.equal(resolveHostRedirect('/login-myou', false, false), '/login')
  assert.equal(resolveHostRedirect('/forgot-password-myou', false, true), '/forgot-password')
  assert.equal(resolveHostRedirect('/reset-password-myou', false, true), '/reset-password')
})
test('その他のパスは null', () => {
  assert.equal(resolveHostRedirect('/top', true, false), null)
  assert.equal(resolveHostRedirect('/login', false, false), null)
  assert.equal(resolveHostRedirect('/login-myou', true, false), null)
})
```

実装:

```ts
/** ホストと画面の組み合わせが不正なら、正しい画面のパスを返す（問題なければ null） */
export function resolveHostRedirect(
  pathname: string,
  isMyou: boolean,
  hasUser: boolean
): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (isMyou) {
    if (!hasUser && (p === '/' || p === '/login')) return '/login-myou'
    if (p === '/forgot-password') return '/forgot-password-myou'
    if (p === '/reset-password') return '/reset-password-myou'
    if (p === '/signup' || p.startsWith('/signup/')) return '/login-myou'
    return null
  }
  if (p === '/login-myou') return '/login'
  if (p === '/forgot-password-myou') return '/forgot-password'
  if (p === '/reset-password-myou') return '/reset-password'
  return null
}
```

- [ ] **Step 5: middleware に組み込む。** `const isMyou = isMyouHost(request.headers.get('host'))` は `updateSession` の直後に 1 回だけ定義する（Task 3b の整合チェックも同じ変数を使う）。`hostRedirect` は `isAuthPage` 等の定義の後、未認証リダイレクトの前に追加（redirect なので Cookie の引き継ぎ不要）:

```ts
// ホストと画面の組み合わせ補正（app ↔ myou の画面を混在させない）
const hostRedirect = resolveHostRedirect(pathname, isMyou, !!user)
if (hostRedirect) {
  return applySecurityHeaders(NextResponse.redirect(new URL(hostRedirect, request.url)))
}
```

既存の「未認証ユーザーが保護ページにアクセス」リダイレクトの宛先も切り替える:

```ts
NextResponse.redirect(
  new URL(isMyou ? APP_ROUTES.AUTH.LOGIN_MYOU : APP_ROUTES.AUTH.LOGIN, request.url)
)
```

- [ ] **Step 6:** `npm test` / `npm run type-check` → PASS
- [ ] **Step 7: コミット** — メッセージ「feat: ホストと認証画面の組み合わせを振り分ける」

---

### Task 3b: 全リクエストでのホスト⇔テナント整合チェック（多層防御）

**背景（再確認で判明）:** `signInAction` の判定は「`/login` `/login-myou` からのログイン」しか守れない。セッションはほかにも次の経路で作られ、判定を通らない。

- `/login-stitches`（`supabase.auth.signInWithPassword` をブラウザから直接実行）
- `api/auth/callback`（メールリンクの `exchangeCodeForSession`）
- LINE の `establishSupabaseSession`（マジックリンク）
- ブラウザから Supabase Auth を直接呼ぶ操作（anon key は公開情報）

これらを個別に塞ぐのではなく、**認証済みの全リクエストで「今のホスト」と「ユーザーのテナント」の整合を middleware で確認し、不整合ならセッションを破棄する**。Task 1 の `isTenantAllowedForAudience` をそのまま使う（myou ホスト → `'myou'`、それ以外 → `'default'`）。Cookie は `domain` 未指定でホスト別のため、この確認でドメイン間の混在は入口を問わず止まる。

**Files:**

- Create: `src/lib/auth/resolve-tenant-id.ts`
- Modify: `src/middleware.ts`（`insertLog` 内のテナント補完処理を共通化して流用）

**Interfaces:**

- Consumes: Task 1 の `isTenantAllowedForAudience` / `getMyouTenantIds`、Task 3 の `isMyouHost`
- Produces: `resolveTenantId(supabase, user): Promise<{ tenantId: string | null; failed: boolean }>`（`user_metadata.tenant_id` を優先し、無ければ `employees.tenant_id` を取得。DB エラー時は `failed: true`）

- [ ] **Step 1:** `resolveTenantId` を作成し、`middleware.ts` の `insertLog` 内の同等処理（`employees` からの補完）を置き換える。**認証済みリクエストごとに 1 回だけ**呼び、結果を `insertLog` と整合チェックで共有する（GET のページ表示では従来も同じ問い合わせを行っているため、実質的な増加は API や非 GET のみ）。
- [ ] **Step 2:** 整合チェックを追加（`updateSession` の直後、`hostRedirect` の前）:

```ts
if (user) {
  const { tenantId, failed } = await resolveTenantId(supabase, user)
  const audience = isMyou ? 'myou' : 'default'
  // DB エラー時は判定を保留（一時的な障害で全員をログアウトさせない）
  if (!failed && !isTenantAllowedForAudience(audience, tenantId, getMyouTenantIds())) {
    await supabase.auth.signOut()
    const loginPath = isMyou ? APP_ROUTES.AUTH.LOGIN_MYOU : APP_ROUTES.AUTH.LOGIN
    const denied = pathname.startsWith('/api/')
      ? NextResponse.json({ ok: false, error: 'アクセス権がありません' }, { status: 403 })
      : NextResponse.redirect(new URL(loginPath, request.url))
    // Supabase の認証 Cookie（sb-*）を確実に削除して返す
    request.cookies
      .getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => denied.cookies.set(c.name, '', { maxAge: 0, path: '/' }))
    return applySecurityHeaders(denied)
  }
}
```

（`updateSession` が返す `response` は `setAll` 内で作り直されるため、`signOut` 後の Cookie 削除は上記のとおり `sb-*` を明示的に消して確実にする。）

- [ ] **Step 3: 手動検証**（Task 7 に統合）：MYOU ユーザーが `/login-stitches` 経由でログインして `/dashboard` に進もうとしても、次のリクエストでログアウトされてログイン画面へ戻る。
- [ ] **Step 4:** `npm run type-check && npm run lint`
- [ ] **Step 5: コミット** — メッセージ「feat: 全リクエストでホストとテナントの整合を確認する」

**LINE / LIFF の扱い（確定）:** MYOU は LINE 連携を使わない（Task 3c で無効化）。整合チェックに `/liff` `/api/line/` の除外は**設けない**（除外すると混在の抜け道になる）。LIFF は共用のまま app ドメインで動き、MYOU テナントのユーザーが LINE 経由でセッションを作っても、次のリクエストで破棄される。

---

### Task 3c: MYOU テナントの LINE 連携を無効化

**方針（確定）:** MYOU は LINE 連携を使わない。MYOU テナントでは LINE 友だち招待を無効にし、LINE 経由のセッション確立・紐付けも受け付けない。LIFF は全テナント共用のまま（app ドメイン）で、MYOU 用の LIFF は作らない。

**背景:** LINE 招待の作成箇所は `sendFriendInvites`（`src/features/line/actions.ts`）の 1 箇所。招待の消費は `p/line-friend-invite/[token]`（QR 表示）→ `api/line/friend-link-accept`（紐付け）→ `api/line/liff-auth`（LINE 経由のセッション確立）。入口から出口まで**サーバー側で**すべて塞ぎ、UI の非表示だけに頼らない。

**Files:**

- Create: `src/lib/line/line-enabled.ts`, `src/lib/line/line-enabled.test.ts`
- Modify: `src/features/line/actions.ts`（`sendFriendInvites`）
- Modify: `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/page.tsx`
- Modify: `src/app/p/line-friend-invite/[token]/page.tsx`
- Modify: `src/app/api/line/friend-link-accept/route.ts`、`src/app/api/line/liff-auth/route.ts`

**Interfaces:**

- Consumes: Task 1 の `getMyouTenantIds`
- Produces: `isLineEnabledForTenant(tenantId: string | null | undefined, myouTenantIds: string[]): boolean`（MYOU テナントなら `false`。それ以外・tenant 不明は `true`＝従来動作）

- [ ] **Step 0（実装前の確認・読み取りのみ）:** MYOU テナントに既存の LINE 連携データが無いことを SELECT で確認する。**対象 DB（ローカル / 本番）を宣言してから実行**。`select count(*) from line_friends where tenant_id in (<MYOU 2 件>)` と `... from line_friend_invites where tenant_id in (...)`。0 件なら影響なし。1 件以上ある場合は、既存の LINE ユーザーが使えなくなるため、実装前に相談する。

- [ ] **Step 1: テスト（失敗させる）**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLineEnabledForTenant } from './line-enabled'

const IDS = ['tenant-public', 'tenant-local']

test('MYOU テナントは LINE 連携を無効', () => {
  assert.equal(isLineEnabledForTenant('tenant-public', IDS), false)
  assert.equal(isLineEnabledForTenant('tenant-local', IDS), false)
})
test('他テナント・tenant 不明は従来どおり有効', () => {
  assert.equal(isLineEnabledForTenant('other', IDS), true)
  assert.equal(isLineEnabledForTenant(null, IDS), true)
  assert.equal(isLineEnabledForTenant(undefined, IDS), true)
})
test('環境変数未設定（空配列）は全テナント有効（従来動作）', () => {
  assert.equal(isLineEnabledForTenant('tenant-public', []), true)
})
```

- [ ] **Step 2: 実装**

```ts
/** MYOU テナントは LINE 連携を使わない。それ以外は従来どおり有効 */
export function isLineEnabledForTenant(
  tenantId: string | null | undefined,
  myouTenantIds: string[]
): boolean {
  return !(tenantId && myouTenantIds.includes(tenantId))
}
```

- [ ] **Step 3: 招待の作成を拒否**（`sendFriendInvites`、`if (!user.tenant_id)` の直後）:

```ts
if (!isLineEnabledForTenant(user.tenant_id, getMyouTenantIds())) {
  throw new Error('この会社ではLINE連携をご利用いただけません')
}
```

- [ ] **Step 4: 管理画面を表示しない**（`line-friend-invites/page.tsx`、認証チェックの直後）:

```tsx
if (!isLineEnabledForTenant(user.tenant_id, getMyouTenantIds())) {
  notFound()
}
```

（メニューからの非表示はサービス割り当て＝DB データの変更になるため、本計画では行わない。必要なら別途、対象 DB を宣言・承認のうえ `tenant_service` から外す。）

- [ ] **Step 5: 招待ページ**（`p/line-friend-invite/[token]/page.tsx`）：`select` に `tenant_id` を追加し、`if (!invite)` の後に判定。**既存の招待が残っていても QR を表示しない**:

```tsx
if (!isLineEnabledForTenant(invite.tenant_id, getMyouTenantIds())) {
  return <MessageCard title="ご利用いただけません" body="現在この機能はご利用いただけません。" />
}
```

- [ ] **Step 6: friend-link-accept**（`invite.tenant_id` を取得済みのため、有効期限チェックの前に）：不許可なら**紐付けを行わず** `NextResponse.json({ error: 'line_disabled' }, { status: 403 })`。
- [ ] **Step 7: liff-auth**（`friend.tenant_id` 確定後・セッション確立の前）：不許可なら**セッションを作らず** `NextResponse.json({ error: 'line_disabled' }, { status: 403 })`。`LiffEntryView` は `not_linked` 以外は `error` 表示になるため、UI 変更は不要（「エラーが発生しました」表示）。
- [ ] **Step 8:** `npm test` / `npm run type-check` / `npm run lint` → PASS
- [ ] **Step 9: コミット** — メッセージ「feat: MYOU テナントの LINE 連携を無効化する」

**補足:** Task 3b の整合チェックにより、app ドメインの LINE 経由セッションが MYOU テナントに作られても次のリクエストで破棄される（多層防御）。Task 3c はそれ以前に、招待・紐付け・セッション確立の段階で止める。

---

### Task 4: 配信設定（allowedOrigins・画像）

**Files:**

- Modify: `next.config.ts:57-64`（`allowedOrigins` に `'https://myou.hr-dx.jp'` と、ローカル検証用の `'http://myou.localhost:3000'` を追加）
- Add: `public/myou/login.webp`（作成済み・未追跡。800×1600px、約 28KB）と `docs/mYou/img/login-padded-800x1600.png`（原本）

- [ ] **Step 1:** `allowedOrigins` を変更。CSP の `img-src` は `'self'` を含むため追加不要（確認済み：`src/lib/security/headers.ts`）。
- [ ] **Step 2: Commit** — `git add next.config.ts public/myou/login.webp docs/mYou/img/login-padded-800x1600.png` のうえ、メッセージ「feat: myou ドメインの Server Action 許可とログイン画像を追加」

---

### Task 5: `/login-myou` 画面

**Files:**

- Create: `src/app/(auth-myou)/login-myou/layout.tsx`, `src/app/(auth-myou)/login-myou/page.tsx`
- Modify: `src/config/routes.ts`（`LOGIN_MYOU` 追加。Task 3 で実施済みならスキップ）

- [ ] **Step 1: layout.tsx**（`(auth)/layout.tsx` をベースに左パネルのみ差し替え）

```tsx
import React from 'react'
import Image from 'next/image'

/** MYOU 専用ログインレイアウト：左パネル中央にブランド画像を配置 */
export default function MyouAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] items-center justify-center bg-[#fdfdfd]">
        <Image
          src="/myou/login.webp"
          alt="セルフィールMS 防カビメンテナンススプレー"
          width={400}
          height={800}
          priority
          className="h-auto max-h-screen w-auto max-w-full object-contain"
        />
      </div>
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
```

（画像は 800×1600px を 2 倍密度で表示するため width=400 / height=800。余白は画像に含まれるので `max-h-screen` まで許容。背景 `#fdfdfd` は画像と同色で、継ぎ目が出ない。）

- [ ] **Step 2: page.tsx** — **方針：共通化せず完全に複製する**（app 側との混在リスクを避けるため。myou 側の変更は今後ほぼ画像差し替えのみ）。`src/app/(auth)/login/page.tsx` を丸ごとコピーし、`signInAction(email, password)` を `signInAction(email, password, 'myou')` に変更、コンポーネント名を `LoginMyouPage` に。「パスワードをお忘れですか？」のリンク先は `/forgot-password-myou`（Task 5b）にする。`loading.tsx` は `(auth)/loading.tsx` を同内容でコピー。**`(auth)` 配下の既存ファイルは一切変更しない。**
- [ ] **Step 3:** `npm run type-check && npm run lint`
- [ ] **Step 4: Commit** — `git add "src/app/(auth-myou)" src/config/routes.ts` のうえ、メッセージ「feat: MYOU 専用ログイン画面 /login-myou を追加」

---

### Task 5b: パスワード再設定の myou 専用フロー

**背景:** `resetPasswordAction` のメールリンクは `NEXT_PUBLIC_SITE_URL/reset-password`（app ドメイン）固定で、再設定後は `/login`（app）へ戻る。myou ユーザーがドメインを跨がないよう、myou 専用ページを複製して用意する。`/forgot-password` `/reset-password` は `(auth)` レイアウト（アニメーション左パネル）でもあるため、専用ページを `(auth-myou)` 配下に置くことで左パネルも画像になる。認証コールバック（`api/auth/callback`）は `origin` を使うためドメインを跨がず変更不要。

**Files:**

- Create: `src/app/(auth-myou)/forgot-password-myou/page.tsx`（`(auth)/forgot-password/page.tsx` の複製。`resetPasswordAction(email, 'myou')` を呼ぶ。「ログインに戻る」リンクは `APP_ROUTES.AUTH.LOGIN_MYOU`）
- Create: `src/app/(auth-myou)/reset-password-myou/page.tsx`（`(auth)/reset-password/page.tsx` の複製。再設定後の `signOut` → 遷移先と各リンクを `APP_ROUTES.AUTH.LOGIN_MYOU` に）
- Modify: `src/lib/auth/actions.ts`（`resetPasswordAction`）、`src/config/routes.ts`（`FORGOT_PASSWORD_MYOU: '/forgot-password-myou'`, `RESET_PASSWORD_MYOU: '/reset-password-myou'` を `AUTH` に追加）

**Interfaces:**

- Consumes: Task 1 の `LoginAudience`
- Produces: `resetPasswordAction(email: string, audience: LoginAudience = 'default')`

- [ ] **Step 1: resetPasswordAction を変更**（`signInAction` と同様、関数の先頭で `isHostAudienceConsistent(host, audience)` を検証し、不一致なら `{ success: false, error: 'このページからはご利用いただけません。' }` を返す）。リクエストの Host ヘッダーは信用せず、**引数 `audience` から固定のベース URL を選ぶ**（任意ホストへのリンク誘導を防ぐ）。

```ts
export async function resetPasswordAction(email: string, audience: LoginAudience = 'default') {
  const supabase = await createClient();

  const baseUrl =
    audience === 'myou'
      ? process.env.MYOU_SITE_URL || 'https://myou.hr-dx.jp'
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const path = audience === 'myou' ? '/reset-password-myou' : '/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}${path}`,
  });
  // 以降は既存のまま
```

`MYOU_SITE_URL`（サーバー専用、未設定時は `https://myou.hr-dx.jp`）。ローカル検証時は `.env.local` に `MYOU_SITE_URL=http://localhost:3000` を設定する。

- [ ] **Step 2:** 2 ページを複製し、上記のとおり myou 用に修正。`(auth)` 配下の既存ページは変更しない。
- [ ] **Step 3:** middleware の `isAuthPage`（`startsWith('/forgot-password')` / `'/reset-password'`）と `isResetPassword`（`startsWith('/reset-password')`）は接頭辞一致のため `-myou` 版も対象になる（変更不要）ことを確認。
- [ ] **Step 4:** `npm run type-check && npm run lint`
- [ ] **Step 5: コミット** — メッセージ「feat: MYOU 専用のパスワード再設定フローを追加」

---

### Task 6: middleware 認証ページ判定の確認

`isAuthPage` は `pathname.startsWith('/login')` のため `/login-myou` も認証不要として扱われる（変更不要）。ただし `/login-stitches` と同様の挙動である旨をコメントで明記する必要はない。確認のみ。

- [ ] **Step 1:** `grep -n "startsWith(APP_ROUTES.AUTH.LOGIN)" src/middleware.ts` で確認。

---

### Task 7: 検証

- [ ] **ローカル手動確認**（`npm run dev`、Supabase ローカル起動。app 側は `http://localhost:3000`、myou 側は `http://myou.localhost:3000` を使う。`.env.local` に `MYOU_SITE_URL=http://myou.localhost:3000` を設定）

  **A. ログインの振り分け**
  1. MYOU テナントのユーザーで `localhost:3000/login` → 拒否メッセージ、`/top` に入れない（`sb-*` Cookie が残らない）
  2. 同ユーザーで `myou.localhost:3000/login-myou` → `/top` へ遷移
  3. 通常テナントのユーザーで `myou.localhost:3000/login-myou` → 拒否、`localhost:3000/login` → 従来どおり
  4. 環境変数 `MYOU_*_TENANT_ID` を一時的に外す：myou 側は全員拒否、app 側は従来どおり

  **B. 画面の混在が起きないこと（ホスト × パス）** 5. `localhost:3000/login-myou` `/forgot-password-myou` `/reset-password-myou` → それぞれ `/login` `/forgot-password` `/reset-password` へ redirect 6. `myou.localhost:3000/` `/login` `/forgot-password` `/reset-password` → それぞれ `/login-myou` `/login-myou` `/forgot-password-myou` `/reset-password-myou` へ redirect（`curl -sI -H 'Host: myou.localhost:3000' http://localhost:3000/login` でも可）7. 左パネルは myou 側の 3 画面すべてで画像、app 側の 3 画面ではアニメーション

  **C. ログイン画面を経由しないセッション（Task 3b）** 8. MYOU ユーザーが `localhost:3000/login-stitches` でログイン → 次のリクエストでログアウトされ `/login` へ戻る（myou 側の `/login-stitches` から通常テナントのユーザーでも同様）9. `api/auth/callback` 経由（パスワード再設定メールのリンク）で作られたセッションも、ホストと不整合なら次のリクエストで破棄される 10. 整合しているユーザー（MYOU × myou、通常 × app）は、ページ遷移・API 呼び出しで影響を受けない（403・強制ログアウトが出ない）

  **E. LINE（MYOU テナントで無効・他テナントは従来どおり）**
  - MYOU テナントの管理者で `/adm/line-friend-invites` → 404、`sendFriendInvites` を直接呼んでも拒否される
  - MYOU テナントの既存招待トークンで `/p/line-friend-invite/<token>` → 「ご利用いただけません」（QR が出ない）
  - MYOU テナントの `friend-link-accept` / `liff-auth` を叩く → 403 `line_disabled`、`line_friends` に行が増えず、セッション Cookie も付かない
  - 通常テナントの招待送信・QR・友だち連携・LIFF ログインは従来どおり動く

  **D. ログアウトとパスワード再設定** 11. ログアウト（AppHeader / SidebarNav / MobileLogoutButton / CompanyDoctorHeader の各ボタン）：app 側は `/login`、myou 側は `/login` 経由で `/login-myou` に戻る（`router.push(APP_ROUTES.AUTH.LOGIN)` の相対遷移のため変更不要。middleware の redirect に依存）12. パスワード再設定（myou）：`/forgot-password-myou` で送信 → メールのリンクが `myou` ホストの `/reset-password-myou` → 再設定後 `/login-myou` に戻る。app 側の `/forgot-password` → `/reset-password` → `/login` は従来どおり

- [ ] `npm test && npm run type-check && npm run lint && npm run build`
- [ ] code-reviewer / security-reviewer エージェントでレビュー（認証変更のため必須）

### Task 8: 本番反映（コード外・要ユーザー作業）

- [ ] Vercel: `myou.hr-dx.jp` ドメイン追加、DNS CNAME 設定
- [ ] Vercel 環境変数: `MYOU_PUBLIC_TENANT_ID` / `MYOU_LOCAL_TENANT_ID`（Production）
- [ ] Vercel 環境変数: `MYOU_SITE_URL=https://myou.hr-dx.jp`（未設定でも既定値で動作するが明示推奨）
- [ ] Supabase Auth の Redirect URLs に `https://myou.hr-dx.jp/reset-password-myou` を追加（**漏れるとパスワード再設定メールのリンクがエラーになる**）

## Self-Review

- 要件1（app 側で MYOU 拒否）→ Task 1・2 / 要件2（myou 側のみ受け入れ）→ Task 1・2 / URL 表示 → Task 3・4 / 左画像差し替え → Task 4・5 / **ログイン画面を経由しないセッションでの混在防止 → Task 3b** / **LINE 連携の無効化 → Task 3c**。
- 型名 `LoginAudience`・`isTenantAllowedForAudience`・`getMyouTenantIds`・`isMyouHost`・`resolveHostRedirect`・`resolveTenantId`・`isLineEnabledForTenant`・`APP_ROUTES.AUTH.LOGIN_MYOU` は全タスクで一致。
- パスワード再設定・ログアウトの myou 対応 → Task 5b・7。app 側の既存ファイルは変更しない方針（`actions.ts` の引数追加のみ、既定値で従来動作）。
- 既知の未対応（スコープ外）: myou ドメインでの `/login` 以外のページの利用制限。
