# 情報掲示板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テナント管理者が `/adm/notion_info` で Notion の 3 DB（人事トレンド / Grok助成金 / AI最新情報）をラジオ切替で閲覧し、「要約」モーダルで本文を読めるようにする。

**Architecture:** 新規ドメイン `src/features/notion-info/`。正本は Notion REST API（サーバー専用 `fetch`）。業務テーブルは作らない。メニューだけマイグレーション。助成金の期限切れ除外と収集日時降順（新しい順）は純粋関数にしてユニットテストする。

**Tech Stack:** Next.js App Router、Notion REST `POST /v1/databases/{id}/query`、`DataTable`、`HelpMarkdownModal` と同シェル、`TenantBackLink`、`toJSTDateString`

**Spec:** `docs/implementation-plan-notion-info-board.md`

## Global Constraints

- `createAdminClient()` は使わない。
- Notion トークンは `NOTION_API_KEY` のみ。`NEXT_PUBLIC_` 禁止。
- `page.tsx` に `fetch` / `supabase.from` を書かない。読み取りは `queries.ts`。
- 日付比較は Asia/Tokyo。`toJSTDateString` を使う。
- 日本語コメント。ファイル末尾に不要な空行を残さない。
- `supabase db reset` / `DROP` / `TRUNCATE` 禁止。マイグレーションは `migration up`。
- 管理者一覧はパターン B: ルートに `w-full` を付けてから `max-w-[1920px] mx-auto`。
- カテゴリ UUID をハードコードしない。`/adm/auto-distribution` の `route_path` で解決。
- Cursor Notion MCP はランタイムに使わない。
- 一覧は収集日時の新しい順（降順）。画面列名は「タイトル」（フィールド名 `title`）。

---

## File Structure Overview

**新規作成:**

- `src/features/notion-info/types.ts`
- `src/features/notion-info/map-page.ts` — Notion ページ → `NotionInfoItem`
- `src/features/notion-info/map-page.test.ts`
- `src/features/notion-info/filter.ts` — 期限切れ除外・降順ソート
- `src/features/notion-info/filter.test.ts`
- `src/features/notion-info/notion-client.ts`
- `src/features/notion-info/queries.ts`
- `src/features/notion-info/components/TabRadioGroup.tsx`
- `src/features/notion-info/components/BodyModal.tsx`
- `src/features/notion-info/components/NotionInfoBoardClient.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(notion_info)/notion_info/page.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(notion_info)/notion_info/loading.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(notion_info)/notion_info/error.tsx`
- `supabase/migrations/<timestamp>_notion_info_board_menu.sql`

**変更:**

- `src/config/routes.ts` — `ADMIN_NOTION_INFO: '/adm/notion_info'`
- `.env.example` — Notion 用 4 変数のコメント付き追加

**作らない:**

- `actions.ts`（v1 書き込みなし）
- `@notionhq/client` 依存
- Notion 同期用 Supabase テーブル

---

### Task 1: 型と Notion ページのマッピング（TDD）

**Files:**

- Create: `src/features/notion-info/types.ts`
- Create: `src/features/notion-info/map-page.ts`
- Test: `src/features/notion-info/map-page.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/features/notion-info/types.ts`:

```typescript
export type NotionInfoTab = 'hr_trend' | 'grant' | 'ai'

export type NotionInfoItem = {
  id: string
  collectedAt: string | null
  title: string
  summary: string
  url: string | null
  body: string
  amount: string | null
  openDate: string | null
  deadline: string | null
  category: string | null
}

/** Notion databases.query の 1 ページ分（必要なキーだけ） */
export type NotionQueryPage = {
  id: string
  properties: Record<string, unknown>
}
```

`src/features/notion-info/map-page.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { mapNotionPage, normalizeRichText, stripUnsafeHtml } from './map-page'

function textProp(content: string) {
  return { type: 'rich_text', rich_text: [{ plain_text: content }] }
}

function titleProp(content: string) {
  return { type: 'title', title: [{ plain_text: content }] }
}

function dateProp(start: string | null) {
  return { type: 'date', date: start ? { start } : null }
}

function urlProp(url: string | null) {
  return { type: 'url', url }
}

test('タイトルはタイトルプロパティを優先し、無ければ title プロパティを使う', () => {
  const withTitle = mapNotionPage({
    id: 'p1',
    properties: {
      タイトル: textProp('助成金A'),
      Status: titleProp('進行中'),
    },
  })
  assert.equal(withTitle.title, '助成金A')

  const trend = mapNotionPage({
    id: 'p2',
    properties: {
      名前: titleProp('労働法改正'),
    },
  })
  assert.equal(trend.title, '労働法改正')
})

test('収集日時・募集期限は date.start の日付部分を取る', () => {
  const item = mapNotionPage({
    id: 'p3',
    properties: {
      名前: titleProp('x'),
      収集日時: dateProp('2026-08-01T10:00:00.000+09:00'),
      募集期限: dateProp('2026-09-30'),
      募集開始日: dateProp('2026-04-01'),
    },
  })
  assert.equal(item.collectedAt, '2026-08-01T10:00:00.000+09:00')
  assert.equal(item.deadline, '2026-09-30')
  assert.equal(item.openDate, '2026-04-01')
})

test('URL は url 型でも rich_text でも取る', () => {
  const a = mapNotionPage({
    id: 'p4',
    properties: { 名前: titleProp('x'), URL: urlProp('https://example.com/a') },
  })
  assert.equal(a.url, 'https://example.com/a')

  const b = mapNotionPage({
    id: 'p5',
    properties: { 名前: titleProp('x'), URL: textProp('https://example.com/b') },
  })
  assert.equal(b.url, 'https://example.com/b')
})

test('本文の br を改行にし、残りのタグを除去する', () => {
  assert.equal(stripUnsafeHtml('A<br>B<br/>C'), 'A\nB\nC')
  assert.equal(stripUnsafeHtml('<p onclick="alert(1)">x</p>'), 'x')
})

test('rich_text の plain_text を連結する', () => {
  assert.equal(
    normalizeRichText({
      type: 'rich_text',
      rich_text: [{ plain_text: 'あ' }, { plain_text: 'い' }],
    }),
    'あい'
  )
})
```

実行して失敗することを確認:

```bash
node --import tsx --test src/features/notion-info/map-page.test.ts
```

Expected: `ERR_MODULE_NOT_FOUND` またはマッピング関数未定義。

- [ ] **Step 2: 実装してテストを通す**

`map-page.ts` の要点:

- プロパティ型 `title` / `rich_text` / `url` / `date` / `number` / `select` / `multi_select` を読む。
- タイトル: `タイトル` → 最初の `type === 'title'`。
- `助成金額` は number なら文字列化、rich_text ならそのまま。
- `区分` は select の `name` または rich_text。
- `stripUnsafeHtml`: `<br\s*/?>` → `\n`、その後 `<[^>]+>` を除去。`dangerouslySetInnerHTML` は使わない。

```bash
node --import tsx --test src/features/notion-info/map-page.test.ts
```

Expected: 全件 pass。

- [ ] **Step 3: コミット**

```bash
git add src/features/notion-info/types.ts src/features/notion-info/map-page.ts src/features/notion-info/map-page.test.ts
git commit -m "$(cat <<'EOF'
Add Notion page mapping for the info bulletin board.

EOF
)"
```

---

### Task 2: 助成金の期限切れ除外と降順ソート（TDD）

**Files:**

- Create: `src/features/notion-info/filter.ts`
- Test: `src/features/notion-info/filter.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { filterExpiredGrants, sortByCollectedAtDesc } from './filter'
import type { NotionInfoItem } from './types'

function item(overrides: Partial<NotionInfoItem>): NotionInfoItem {
  return {
    id: 'id',
    collectedAt: null,
    title: 't',
    summary: '',
    url: null,
    body: '',
    amount: null,
    openDate: null,
    deadline: null,
    category: null,
    ...overrides,
  }
}

test('募集期限が今日より前なら除外し、当日・未来・未設定は残す', () => {
  const rows = [
    item({ id: 'past', deadline: '2026-09-12' }),
    item({ id: 'today', deadline: '2026-09-13' }),
    item({ id: 'future', deadline: '2026-09-14' }),
    item({ id: 'none', deadline: null }),
  ]
  const kept = filterExpiredGrants(rows, '2026-09-13').map(r => r.id)
  assert.deepEqual(kept, ['today', 'future', 'none'])
})

test('収集日時の降順。null は末尾', () => {
  const rows = [
    item({ id: 'b', collectedAt: '2026-08-02T00:00:00.000Z' }),
    item({ id: 'null', collectedAt: null }),
    item({ id: 'a', collectedAt: '2026-08-01T00:00:00.000Z' }),
  ]
  assert.deepEqual(
    sortByCollectedAtDesc(rows).map(r => r.id),
    ['b', 'a', 'null']
  )
})
```

```bash
node --import tsx --test src/features/notion-info/filter.test.ts
```

- [ ] **Step 2: 実装して通す**

`filterExpiredGrants(items, todayYmd)` は `deadline` が空、または `deadline >= todayYmd`。日付文字列比較で足りる（`YYYY-MM-DD`）。

`sortByCollectedAtDesc` は元配列を変異させない。

クエリ側は `toJSTDateString(new Date())` を渡す。テストに `new Date()` を直接入れない。

- [ ] **Step 3: コミット**

```bash
git add src/features/notion-info/filter.ts src/features/notion-info/filter.test.ts
git commit -m "$(cat <<'EOF'
Filter expired grants and sort bulletin rows by collected date.

EOF
)"
```

---

### Task 3: Notion REST クライアントと queries

**Files:**

- Create: `src/features/notion-info/notion-client.ts`
- Create: `src/features/notion-info/queries.ts`

- [ ] **Step 1: `notion-client.ts`**

```typescript
const NOTION_VERSION = '2022-06-28'
const QUERY_URL = (databaseId: string) => `https://api.notion.com/v1/databases/${databaseId}/query`

export type NotionQueryResult = {
  results: Array<{ id: string; properties: Record<string, unknown> }>
  has_more: boolean
  next_cursor: string | null
}

function requireApiKey(): string {
  const key = process.env.NOTION_API_KEY
  if (!key) {
    throw new Error('NOTION_API_KEY is not configured')
  }
  return key
}

/** ハイフン有無を正規化して Notion に渡す */
export function normalizeNotionId(id: string): string {
  const compact = id.replace(/-/g, '')
  if (compact.length !== 32) return id
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
}

export async function queryDatabase(databaseId: string): Promise<NotionQueryResult['results']> {
  const key = requireApiKey()
  const pages: NotionQueryResult['results'] = []
  let cursor: string | undefined

  do {
    const res = await fetch(QUERY_URL(normalizeNotionId(databaseId)), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        sorts: [{ property: '収集日時', direction: 'descending' }],
      }),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Notion query failed (${res.status}): ${text.slice(0, 300)}`)
    }

    const json = (await res.json()) as NotionQueryResult
    pages.push(...json.results)
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined
  } while (cursor)

  return pages
}

export function getNotionDatabaseIds(): {
  hrTrend: string
  grant: string
  ai: string
} | null {
  const hrTrend = process.env.NOTION_DB_HR_TREND_ID
  const grant = process.env.NOTION_DB_GRANT_ID
  const ai = process.env.NOTION_DB_AI_ID
  if (!process.env.NOTION_API_KEY || !hrTrend || !grant || !ai) return null
  return { hrTrend, grant, ai }
}
```

`収集日時` ソートが DB に無い場合 Notion は 400 を返す。そのときは `sorts` を外して取得し、`sortByCollectedAtDesc` に任せるフォールバックを入れる。

- [ ] **Step 2: `queries.ts`**

```typescript
import { toJSTDateString } from '@/lib/datetime'

import { filterExpiredGrants, sortByCollectedAtDesc } from './filter'
import { mapNotionPage } from './map-page'
import { getNotionDatabaseIds, queryDatabase } from './notion-client'
import type { NotionInfoItem, NotionInfoTab } from './types'

export type NotionInfoBoardData = {
  configured: boolean
  errorMessage: string | null
  items: Record<NotionInfoTab, NotionInfoItem[]>
}

const EMPTY: Record<NotionInfoTab, NotionInfoItem[]> = {
  hr_trend: [],
  grant: [],
  ai: [],
}

export async function getNotionInfoBoard(): Promise<NotionInfoBoardData> {
  const ids = getNotionDatabaseIds()
  if (!ids) {
    return {
      configured: false,
      errorMessage: '情報掲示板の接続設定がありません。運営者に連絡してください。',
      items: EMPTY,
    }
  }

  try {
    const [hrPages, grantPages, aiPages] = await Promise.all([
      queryDatabase(ids.hrTrend),
      queryDatabase(ids.grant),
      queryDatabase(ids.ai),
    ])
    const today = toJSTDateString()
    return {
      configured: true,
      errorMessage: null,
      items: {
        hr_trend: sortByCollectedAtDesc(hrPages.map(mapNotionPage)),
        grant: sortByCollectedAtDesc(filterExpiredGrants(grantPages.map(mapNotionPage), today)),
        ai: sortByCollectedAtDesc(aiPages.map(mapNotionPage)),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notion の取得に失敗しました'
    return { configured: true, errorMessage: message, items: EMPTY }
  }
}
```

未設定と API 失敗は throw せず戻り値で返す（ページ全体の `error.tsx` に落とさない）。

- [ ] **Step 3: `.env.example` に追記**

```
# 情報掲示板（/adm/notion_info）— Notion Internal Integration。NEXT_PUBLIC_ は付けない
# 3つのデータベースを Integration に Share すること
NOTION_API_KEY=
NOTION_DB_HR_TREND_ID=3da121bf-139a-80dd-8e33-cecfe7cce9a3
NOTION_DB_GRANT_ID=3da121bf-139a-80a4-bd40-e1569a8433e3
NOTION_DB_AI_ID=3da121bf-139a-80ee-92ce-d5e9a8e9fb16
```

- [ ] **Step 4: コミット**

```bash
git add src/features/notion-info/notion-client.ts src/features/notion-info/queries.ts .env.example
git commit -m "$(cat <<'EOF'
Add server-side Notion queries for the info bulletin board.

EOF
)"
```

---

### Task 4: UI（ラジオ・テーブル・本文モーダル）

**Files:**

- Create: `src/features/notion-info/components/TabRadioGroup.tsx`
- Create: `src/features/notion-info/components/BodyModal.tsx`
- Create: `src/features/notion-info/components/NotionInfoBoardClient.tsx`

参照:

- ラジオ: `src/features/law-research/components/ModeRadioGroup.tsx`
- テーブル+本文ボタン: `src/features/grant-notifier/components/ArchiveDeliveryTable.tsx`
- モーダルシェル: `src/components/help/HelpMarkdownModal.tsx`
- 戻る: `TenantBackLink`
- 日付表示: `src/features/grant-notifier/components/format.ts` の `formatJstDate` を再利用してよい

- [ ] **Step 1: `TabRadioGroup`**

3 選択肢:

| value      | label            |
| ---------- | ---------------- |
| `hr_trend` | 最新人事トレンド |
| `grant`    | 助成金情報       |
| `ai`       | AI最新情報       |

`name="notion-info-tab"`。選択時は `border-[#FD7601]`。

- [ ] **Step 2: `BodyModal`**

`HelpMarkdownModal` と同じ `DialogContent` / `DialogHeader` クラス。タイトルは行の `title`。本文は `whitespace-pre-wrap text-sm text-slate-700 leading-7`。`dangerouslySetInnerHTML` 禁止。

- [ ] **Step 3: `NotionInfoBoardClient`**

パターン B:

```tsx
<div className="w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px] space-y-4">
```

ヘッダー:

```tsx
<div className="flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 className="text-xl font-semibold text-slate-900">情報掲示板</h1>
    <p className="mt-1 text-sm text-slate-500">
      Notion に収集した人事トレンド・助成金・AI 最新情報を閲覧できます。
    </p>
  </div>
  <TenantBackLink />
</div>
```

タブ切替は `useRouter` + `searchParams` で `?tab=` を更新（`APP_ROUTES.TENANT.ADMIN_NOTION_INFO`）。不正値は `hr_trend`。

列:

- 共通: 日付（`formatJstDate(collectedAt)`、`font-mono text-xs`）、タイトル、要約（`line-clamp-3`）、URL（外部リンク）、要約ボタン
- 助成金のみ追加: 助成金額、募集開始日、募集期限、区分

要約ボタン: `body.trim()` が空なら `disabled`。ラベルは仕様どおり「要約」。

`getRowId={item => item.id}`。`searchable` `searchKey="title"` `searchPlaceholder="タイトルで検索..."`。

`configured === false` または `errorMessage` があるときはテーブルの代わりに警告カード。

- [ ] **Step 4: コミット**

```bash
git add src/features/notion-info/components
git commit -m "$(cat <<'EOF'
Add info bulletin board list UI with summary modal.

EOF
)"
```

---

### Task 5: ルート・ページ・メニュー

**Files:**

- Modify: `src/config/routes.ts`（`ADMIN_GRANT_NOTIFIER` 付近）
- Create: `page.tsx` / `loading.tsx` / `error.tsx`
- Create: `supabase/migrations/<timestamp>_notion_info_board_menu.sql`

- [ ] **Step 1: ルート定数**

```typescript
    /** 情報掲示板（Notion の人事トレンド・助成金・AI最新情報） */
    ADMIN_NOTION_INFO: '/adm/notion_info',
```

- [ ] **Step 2: `page.tsx`**

```tsx
import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { NotionInfoBoardClient } from '@/features/notion-info/components/NotionInfoBoardClient'
import { getNotionInfoBoard } from '@/features/notion-info/queries'
import type { NotionInfoTab } from '@/features/notion-info/types'

function parseTab(value: unknown): NotionInfoTab {
  return value === 'grant' || value === 'ai' || value === 'hr_trend' ? value : 'hr_trend'
}

export default async function NotionInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const params = await searchParams
  const initialTab = parseTab(typeof params.tab === 'string' ? params.tab : undefined)
  const data = await getNotionInfoBoard()

  return <NotionInfoBoardClient initialTab={initialTab} data={data} />
}
```

`loading.tsx` はスケルトン（ラジオ相当の 3 枠 + テーブル行）。`error.tsx` は既存 adm 画面に合わせる。

- [ ] **Step 3: メニュー SQL**

タイムスタンプは実行時の JST。`service.id` は `f30f07bd-ed29-4ca3-ab52-9abc83c70c7b`。

構造は `supabase/migrations/20260807022514_grant_notifier.sql` のテナント管理者メニュー部分をコピーし、SaaS 管理者サービスは作らない。

- カテゴリ: `route_path = '/adm/auto-distribution'`
- フォールバック: `service_category.name = 'ツールボックス'` `ORDER BY sort_order DESC`
- `tenant_service` は兄弟と同じテナントのみ
- `app_role_service` には入れない
- `ON CONFLICT (id) DO NOTHING`
- `CREATE TABLE` / `DROP` は書かない

`name` / `title`: `情報掲示板`  
`description`: `Notion に収集した最新人事トレンド・助成金情報・AI最新情報を一覧し、本文を確認できます。`  
`sort_order`: 兄弟より後ろ（例: 50）  
`target_audience`: `adm`  
`release_status`: `公開`

適用:

```bash
supabase migration up
```

Expected: 新マイグレーションが適用される。既存データは消えない。

- [ ] **Step 4: 型チェック**

```bash
npm run type-check
```

Expected: 新規ファイル由来のエラーなし。

- [ ] **Step 5: コミット**

```bash
git add src/config/routes.ts src/app/(tenant)/(tenant-admin)/adm/(notion_info) supabase/migrations/*_notion_info_board_menu.sql
git commit -m "$(cat <<'EOF'
Register the info bulletin board route and admin menu.

EOF
)"
```

---

### Task 6: 動作確認

- [ ] **Step 1: ローカル `.env` に 4 変数を入れる（ユーザー作業）**

Notion で Internal Integration を作り、3 DB を Share する。トークンをコミットしない。

- [ ] **Step 2: ユニットテスト**

```bash
node --import tsx --test src/features/notion-info/*.test.ts
```

Expected: pass。

- [ ] **Step 3: ブラウザ（テナント管理者）**

1. `/adm/notion_info` が開ける。
2. 初期タブが最新人事トレンド。日付が新しい順。列が日付・タイトル・要約・URL・要約ボタン。
3. ラジオで助成金へ。期限切れが無い。追加列が出る。
4. AI最新情報へ。人事トレンドと同じ列。
5. 「要約」で本文モーダル。閉じる。
6. URL が別タブ。
7. `?tab=grant` でリロードしても助成金のまま。
8. 従業員アカウントでは `/top` へ。
9. DevTools に `NOTION_API_KEY` が無い。

- [ ] **Step 4: 最終コミット（あれば）**

確認中の修正があれば通常どおりコミット。ユーザーが依頼するまで push しない。

---

## Execution Handoff

実装開始時にユーザーへ:

> 実装計画は `docs/superpowers/plans/2026-09-13-notion-info-board.md` です。Subagent-Driven Development と executing-plans のどちらで進めますか？
