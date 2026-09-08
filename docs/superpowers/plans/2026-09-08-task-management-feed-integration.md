# タスク管理 ダッシュボードフィード連携 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク管理機能（Phase 3）の2番目のサブ機能として、既存の`dashboard/feed`基盤に「割当・期限接近通知」「コメント通知」の2種類のフィードアイテムを供給する`FeedProvider`を実装する。

**Architecture:** 既存の`dashboard/feed`基盤（プル型：各機能ドメインが`FeedProvider`を実装し読み取り時に都度導出する。過去になりすまし投稿の脆弱性で廃止された汎用書き込みRPCは復活させない）に、新規`taskManagementFeedProvider`を追加する。新規テーブルは無く、`ui_dashboard_element`へのマスタ登録行の追加のみ。既存の`tasks`/`task_comments`テーブルをRLS任せで読み取る。

**Tech Stack:** Next.js 16 App Router、TypeScript（strict: false）、Supabase（PostgreSQL + RLS）。

**Spec:** `docs/implementation-plan-task-management.md` セクション3（要求12）、セクション16（Phase 3 詳細設計：ダッシュボードフィード連携）

## Global Constraints

- 新規テーブル・マイグレーションは`ui_dashboard_element`への行追加のみ。イベントログ用テーブルは追加しない
- 汎用の書き込みAPI（`createFeedEvent()`的なもの）は追加しない。既存の`post_system_announcement()`廃止判断（なりすまし投稿の脆弱性）を踏襲し、本機能はプル型（読み取り時に都度導出）で完結させる
- `queries.ts`と同じ規約：RLSが可視範囲を絞り込むため、追加のテナント・権限フィルタは行わない
- `FeedProvider`の`fetch(ctx)`は`ctx.employeeId`が空文字列（従業員レコード無しユーザー）の場合、必ず空配列を返す（既存の`one_on_one`/`questionnaire`等のプロバイダと同じガード）
- 共有ファイル（`src/features/dashboard/feed/types.ts`、`registry.ts`、`src/features/dashboard/components/FeedItemRow.tsx`）への変更は、既存の他カテゴリの動作に一切影響を与えない**追加のみ**に限定する（既存の行・エントリを変更・削除しない）
- ビジネスロジック（severity判定・コンテキスト解決）は、既存の`one-on-one/feed-provider.ts`/`questionnaire/feed-provider.ts`と同じパターンで、Supabaseクエリを含まない純粋関数として実装し、`node:test`でユニットテストする（DB接続を要する`fetch()`メソッド自体はテストしない、既存規約通り）
- コードコメントは日本語で記述する

---

### Task 1: `taskManagementFeedProvider` の実装

**Files:**

- Create: `src/features/task-management/feed-provider.ts`
- Create: `src/features/task-management/feed-provider.test.ts`

**Interfaces:**

- Consumes: 既存の`FeedProvider`/`FeedProviderContext`型（`src/features/dashboard/feed/provider.ts`）、`RawFeedItem`型（`src/features/dashboard/feed/types.ts`）、`APP_ROUTES.tasks.groupDetail`、`toJSTDateString`（`src/lib/datetime.ts`）
- Produces: `taskManagementFeedProvider: FeedProvider`（Task 2の`registry.ts`がこれをimportする）。エクスポートされる純粋関数`toTaskAssignmentFeedItems`/`toTaskCommentFeedItems`/`resolveTaskCommentContext`と型`AssignedTaskRow`/`RawTaskCommentRow`/`TaskCommentFeedRow`

- [ ] **Step 1: 割当通知の失敗するテストを先に書く**

`src/features/task-management/feed-provider.test.ts`を作成する。

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  toTaskAssignmentFeedItems,
  toTaskCommentFeedItems,
  resolveTaskCommentContext,
  type AssignedTaskRow,
  type RawTaskCommentRow,
} from './feed-provider'

function assignedTaskRow(overrides: Partial<AssignedTaskRow>): AssignedTaskRow {
  return {
    id: 't-1',
    title: '設計書レビュー',
    task_group_id: 'g-1',
    due_date: null,
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

test('空配列なら空配列を返す（割当通知）', () => {
  assert.deepEqual(toTaskAssignmentFeedItems([], '2026-08-20'), [])
})

test('id をキーにdedupeKeyとリンクを生成する（割当通知）', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ id: 'xyz', task_group_id: 'g-9' })],
    '2026-08-20'
  )
  assert.equal(items[0].dedupeKey, 'task_assignment:xyz')
  assert.equal(items[0].href, '/tasks/groups/g-9')
})

test('期限超過ならcritical', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ due_date: '2026-08-19' })],
    '2026-08-20'
  )
  assert.equal(items[0].severity, 'critical')
})

test('期限が3日以内ならwarning', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ due_date: '2026-08-22' })],
    '2026-08-20'
  )
  assert.equal(items[0].severity, 'warning')
})

test('期限がちょうど3日後もwarning（境界値）', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ due_date: '2026-08-23' })],
    '2026-08-20'
  )
  assert.equal(items[0].severity, 'warning')
})

test('期限が3日超先ならaction', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ due_date: '2026-09-01' })],
    '2026-08-20'
  )
  assert.equal(items[0].severity, 'action')
})

test('期限未設定ならaction', () => {
  const items = toTaskAssignmentFeedItems([assignedTaskRow({ due_date: null })], '2026-08-20')
  assert.equal(items[0].severity, 'action')
})

test('kindはaction_prompt、dismissibleはfalse、categoryはtask_management', () => {
  const items = toTaskAssignmentFeedItems([assignedTaskRow({})], '2026-08-20')
  assert.equal(items[0].kind, 'action_prompt')
  assert.equal(items[0].dismissible, false)
  assert.equal(items[0].category, 'task_management')
})

test('created_at をoccurredAtに使う', () => {
  const items = toTaskAssignmentFeedItems(
    [assignedTaskRow({ created_at: '2026-07-15T03:00:00.000Z' })],
    '2026-08-20'
  )
  assert.equal(items[0].occurredAt, '2026-07-15T03:00:00.000Z')
})

test('タスク単位のコメント行からコンテキストを解決する', () => {
  const row: RawTaskCommentRow = {
    id: 'c-1',
    body: '進捗いかがですか',
    created_at: '2026-08-20T01:00:00.000Z',
    employee: { name: '山田太郎' },
    task_id: 't-1',
    task_group_id: null,
    task: { title: '設計書レビュー', task_group_id: 'g-1' },
    taskGroup: null,
  }
  const resolved = resolveTaskCommentContext(row)
  assert.equal(resolved?.href, '/tasks/groups/g-1')
  assert.equal(resolved?.contextLabel, 'タスク「設計書レビュー」')
  assert.equal(resolved?.employeeName, '山田太郎')
})

test('タスクグループ単位のコメント行からコンテキストを解決する', () => {
  const row: RawTaskCommentRow = {
    id: 'c-2',
    body: '来週までにお願いします',
    created_at: '2026-08-20T01:00:00.000Z',
    employee: { name: '佐藤花子' },
    task_id: null,
    task_group_id: 'g-2',
    task: null,
    taskGroup: { name: 'フロントエンド開発' },
  }
  const resolved = resolveTaskCommentContext(row)
  assert.equal(resolved?.href, '/tasks/groups/g-2')
  assert.equal(resolved?.contextLabel, 'タスクグループ「フロントエンド開発」')
})

test('名前未設定の投稿者はフォールバック表示になる', () => {
  const row: RawTaskCommentRow = {
    id: 'c-3',
    body: 'test',
    created_at: '2026-08-20T01:00:00.000Z',
    employee: { name: null },
    task_id: null,
    task_group_id: 'g-1',
    task: null,
    taskGroup: { name: 'グループA' },
  }
  const resolved = resolveTaskCommentContext(row)
  assert.equal(resolved?.employeeName, '（名前未設定）')
})

test('task/taskGroup の埋め込みが両方欠落している行はnullを返す', () => {
  const row: RawTaskCommentRow = {
    id: 'c-4',
    body: 'test',
    created_at: '2026-08-20T01:00:00.000Z',
    employee: null,
    task_id: 't-1',
    task_group_id: null,
    task: null,
    taskGroup: null,
  }
  assert.equal(resolveTaskCommentContext(row), null)
})

test('空配列なら空配列を返す（コメント通知）', () => {
  assert.deepEqual(toTaskCommentFeedItems([]), [])
})

test('kindはsystem_notice、dismissibleはtrue、severityはinfo', () => {
  const items = toTaskCommentFeedItems([
    {
      id: 'c-1',
      body: 'x',
      employeeName: '山田太郎',
      href: '/tasks/groups/g-1',
      contextLabel: 'タスク「A」',
      createdAt: '2026-08-20T01:00:00.000Z',
    },
  ])
  assert.equal(items[0].kind, 'system_notice')
  assert.equal(items[0].dismissible, true)
  assert.equal(items[0].severity, 'info')
  assert.equal(items[0].dedupeKey, 'task_comment:c-1')
  assert.equal(items[0].category, 'task_management')
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- --test-name-pattern="通知|コンテキスト"`
Expected: FAIL（`./feed-provider`モジュールが存在しない）

- [ ] **Step 3: 実装する**

`src/features/task-management/feed-provider.ts`を作成する。

```typescript
import { createClient } from '@/lib/supabase/server'
import { toJSTDateString } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem, FeedItemSeverity } from '@/features/dashboard/feed/types'

/** この日数以内に期限が迫っていれば warning として扱う */
const APPROACHING_DAYS = 3
/** この日数以内に投稿されたコメントのみ通知対象とする */
const COMMENT_LOOKBACK_DAYS = 3

export interface AssignedTaskRow {
  id: string
  title: string
  task_group_id: string
  due_date: string | null
  created_at: string
}

function computeAssignmentSeverity(dueDate: string | null, todayYmd: string): FeedItemSeverity {
  if (!dueDate) return 'action'
  if (dueDate < todayYmd) return 'critical'

  const daysUntil = Math.ceil(
    (new Date(`${dueDate}T00:00:00+09:00`).getTime() -
      new Date(`${todayYmd}T00:00:00+09:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  )
  return daysUntil <= APPROACHING_DAYS ? 'warning' : 'action'
}

/**
 * 自分が担当し未完了のタスクを、割当・期限接近通知のフィードアイテムに変換する。
 * kind は action_prompt（タスクが完了する、または担当から外れるまで表示され続ける。
 * FeedItemRow.tsx の canDismiss 判定が kind === 'system_notice' を要求するため、
 * action_prompt は構造的に既読化できない——これは意図的な仕様であり dismissible: false
 * と合わせて「タスクが残っている限り出続ける」という設計を表す）。
 */
export function toTaskAssignmentFeedItems(
  rows: AssignedTaskRow[],
  todayYmd: string = toJSTDateString()
): RawFeedItem[] {
  return rows.map(row => ({
    dedupeKey: `task_assignment:${row.id}`,
    kind: 'action_prompt',
    category: 'task_management',
    severity: computeAssignmentSeverity(row.due_date, todayYmd),
    title: `担当タスク: ${row.title}`,
    body: null,
    actionLabel: null,
    href: APP_ROUTES.tasks.groupDetail(row.task_group_id),
    occurredAt: row.created_at,
    dueDate: row.due_date,
    dismissible: false,
  }))
}

/** `task_comments` を `employee:employee_id(name)` / `task:task_id(title, task_group_id)` /
 * `taskGroup:task_group_id(name)` の埋め込み付きで取得した際の1行の形（Supabaseの
 * 埋め込みリレーションは多対一のため単一オブジェクトで返る）。 */
export interface RawTaskCommentRow {
  id: string
  body: string
  created_at: string
  employee: { name: string | null } | null
  task_id: string | null
  task_group_id: string | null
  task: { title: string; task_group_id: string } | null
  taskGroup: { name: string } | null
}

/** フィードアイテムへの変換に必要な情報だけを持つ、コンテキスト解決済みの行 */
export interface TaskCommentFeedRow {
  id: string
  body: string
  employeeName: string
  href: string
  contextLabel: string
  createdAt: string
}

/**
 * コメントがタスク単位・タスクグループ単位のどちらに紐づくか（`task_comments` の
 * XOR制約）を判定し、表示に必要な情報（リンク先・文脈ラベル）を解決する。
 * 対応する埋め込みが取得できていない（想定外の）行は防御的に null を返し、
 * 呼び出し側で除外する。
 */
export function resolveTaskCommentContext(row: RawTaskCommentRow): TaskCommentFeedRow | null {
  const employeeName = row.employee?.name ?? '（名前未設定）'

  if (row.task_id && row.task) {
    return {
      id: row.id,
      body: row.body,
      employeeName,
      href: APP_ROUTES.tasks.groupDetail(row.task.task_group_id),
      contextLabel: `タスク「${row.task.title}」`,
      createdAt: row.created_at,
    }
  }

  if (row.task_group_id && row.taskGroup) {
    return {
      id: row.id,
      body: row.body,
      employeeName,
      href: APP_ROUTES.tasks.groupDetail(row.task_group_id),
      contextLabel: `タスクグループ「${row.taskGroup.name}」`,
      createdAt: row.created_at,
    }
  }

  return null
}

/** コンテキスト解決済みのコメント行を、コメント通知のフィードアイテムに変換する。
 * kind は system_notice（既読化可能）。 */
export function toTaskCommentFeedItems(rows: TaskCommentFeedRow[]): RawFeedItem[] {
  return rows.map(row => ({
    dedupeKey: `task_comment:${row.id}`,
    kind: 'system_notice',
    category: 'task_management',
    severity: 'info',
    title: `${row.employeeName}さんから${row.contextLabel}へのコメント`,
    body: row.body,
    actionLabel: null,
    href: row.href,
    occurredAt: row.createdAt,
    dueDate: null,
    dismissible: true,
  }))
}

export const taskManagementFeedProvider: FeedProvider = {
  key: 'task_management',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []

    const supabase = await createClient()
    const lookbackIso = new Date(
      Date.now() - COMMENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    // 2つのクエリは互いに独立した通知種別（割当 / コメント）を表す。
    // Promise.all で片方の失敗が全体を失敗させる設計は、queries.ts 側の
    // Promise.allSettled による「プロバイダ単位でのgraceful degradation」と
    // 整合する（本プロバイダの2種別を部分的にしか出せない中途半端な状態を避ける）。
    const [assignedResult, commentResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, task_group_id, due_date, created_at')
        .eq('assignee_employee_id', ctx.employeeId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('task_comments')
        .select(
          'id, body, created_at, employee:employee_id(name), task_id, task_group_id, task:task_id(title, task_group_id), taskGroup:task_group_id(name)'
        )
        .neq('employee_id', ctx.employeeId)
        .gte('created_at', lookbackIso)
        .order('created_at', { ascending: false }),
    ])

    if (assignedResult.error) throw assignedResult.error
    if (commentResult.error) throw commentResult.error

    const assignmentItems = toTaskAssignmentFeedItems(assignedResult.data ?? [])

    const commentRows = ((commentResult.data ?? []) as unknown as RawTaskCommentRow[])
      .map(resolveTaskCommentContext)
      .filter((row): row is TaskCommentFeedRow => row !== null)
    const commentItems = toTaskCommentFeedItems(commentRows)

    return [...assignmentItems, ...commentItems]
  },
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- --test-name-pattern="通知|コンテキスト"`
Expected: PASS（16件）

- [ ] **Step 5: 型チェック**

Run: `npm run type-check`
Expected: エラーなし。ただし`category: 'task_management'`は現時点でまだ`FeedItemCategory`型に含まれていないため、Task 2で型定義を追加するまでは型エラーが出る。この時点でのエラーが「`'task_management'` は型 `FeedItemCategory` に割り当てられません」のみであることを確認する（想定内のタスク境界であり、Task 2で解消される）

- [ ] **Step 6: Commit**

```bash
git add src/features/task-management/feed-provider.ts src/features/task-management/feed-provider.test.ts
git commit -m "feat: タスク管理の割当・コメント通知をdashboard/feed向けに実装

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `FeedItemCategory`・`registry.ts`・`FeedItemRow.tsx` への登録

**Files:**

- Modify: `src/features/dashboard/feed/types.ts`
- Modify: `src/features/dashboard/feed/registry.ts`
- Modify: `src/features/dashboard/components/FeedItemRow.tsx`

**Interfaces:**

- Consumes: Task 1 の `taskManagementFeedProvider`
- Produces: `FeedItemCategory` に `'task_management'` が追加された状態（Task 1 の型エラーを解消する）

- [ ] **Step 1: `FeedItemCategory` に `task_management` を追加する**

`src/features/dashboard/feed/types.ts` の `FeedItemCategory` union に、末尾の要素として追加する。

```typescript
export type FeedItemCategory =
  | 'hr_announcement'
  | 'health_check'
  | 'e_learning'
  | 'one_on_one'
  | 'career_discussion'
  | 'overtime_compliance'
  | 'consultation'
  | 'kudos'
  | 'questionnaire'
  | 'lifecycle'
  | 'task_management'
```

- [ ] **Step 2: `registry.ts` に登録する**

`src/features/dashboard/feed/registry.ts` の import 群に以下を追加する。

```typescript
import { taskManagementFeedProvider } from '@/features/task-management/feed-provider'
```

`FEED_PROVIDERS` 配列の末尾に追加する。

```typescript
export const FEED_PROVIDERS: FeedProvider[] = [
  announcementFeedProvider,
  consultationFeedProvider,
  kudosFeedProvider,
  questionnaireFeedProvider,
  lifecycleFeedProvider,
  eLearningFeedProvider,
  oneOnOneFeedProvider,
  careerDiscussionFeedProvider,
  healthCheckFeedProvider,
  overtimeComplianceFeedProvider,
  taskManagementFeedProvider,
]
```

- [ ] **Step 3: `FeedItemRow.tsx` にアイコン・色を追加する**

`src/features/dashboard/components/FeedItemRow.tsx` の import に `ListTodo` を追加する（既存の `lucide-react` からの import 文に追加、新しい import 文は作らない）。

```typescript
import {
  ChevronRight,
  Check,
  Bell,
  MessageCircleWarning,
  Heart,
  ClipboardList,
  ClipboardCheck,
  ListTodo,
} from 'lucide-react'
```

`CATEGORY_ICON` に追加する。

```typescript
const CATEGORY_ICON: Record<FeedItemCategory, typeof Bell> = {
  hr_announcement: Bell,
  consultation: MessageCircleWarning,
  kudos: Heart,
  questionnaire: ClipboardList,
  lifecycle: ClipboardCheck,
  health_check: Bell,
  e_learning: ClipboardList,
  one_on_one: Bell,
  career_discussion: Bell,
  overtime_compliance: MessageCircleWarning,
  task_management: ListTodo,
}
```

`CATEGORY_COLOR` に追加する。

```typescript
const CATEGORY_COLOR: Record<FeedItemCategory, string> = {
  hr_announcement: 'bg-blue-100 text-blue-600',
  consultation: 'bg-rose-100 text-rose-700',
  kudos: 'bg-amber-100 text-amber-700',
  questionnaire: 'bg-sky-100 text-sky-700',
  lifecycle: 'bg-amber-100 text-amber-700',
  health_check: 'bg-teal-100 text-teal-700',
  e_learning: 'bg-indigo-100 text-indigo-700',
  one_on_one: 'bg-purple-100 text-purple-700',
  career_discussion: 'bg-purple-100 text-purple-700',
  overtime_compliance: 'bg-red-100 text-red-700',
  task_management: 'bg-emerald-100 text-emerald-700',
}
```

`CATEGORY_ICON`/`CATEGORY_COLOR` 以外の行、および他カテゴリの既存エントリは一切変更しない。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- --test-name-pattern="通知|コンテキスト"`
Expected: PASS（16件、Task 1で追加した分。Task 1時点の型エラーがここで解消されている）

- [ ] **Step 5: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 6: Lint**

Run: `npx eslint src/features/dashboard/feed/types.ts src/features/dashboard/feed/registry.ts src/features/dashboard/components/FeedItemRow.tsx src/features/task-management/feed-provider.ts`
Expected: No issues found

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/feed/types.ts src/features/dashboard/feed/registry.ts src/features/dashboard/components/FeedItemRow.tsx
git commit -m "feat: タスク管理フィードをdashboard/feedのレジストリ・表示コンポーネントに登録

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `ui_dashboard_element` マイグレーション

**Files:**

- Create: `supabase/migrations/<timestamp>_top_feed_task_management_ui_dashboard_element.sql`

**Interfaces:**

- Consumes: 既存の `ui_dashboard_element`/`service` テーブル、Phase 1 のマスタ登録で作成済みの `route_path = '/tasks'` の `service` 行
- Produces: `ui_dashboard_element.element_key = 'top.feed.task_management'` の行（`tenant_service`/`tenant_ui_dashboard_element` によるテナント単位の表示制御に組み込まれる）

- [ ] **Step 1: マイグレーションファイルを作成する**

Run: `supabase migration new top_feed_task_management_ui_dashboard_element`

生成されたファイルに以下を書き込む（`20260821100000_top_feed_phase2_ui_dashboard_element.sql` と同じ2ステップ構成：INSERT → UPDATE...JOIN による `service_id` 紐付け）。

```sql
-- /top 通知フィードへのタスク管理連携（要求12）。
-- タスク管理機能の service（route_path='/tasks'）へ service_id を紐付けることで、
-- tenant_service 未契約テナントには本プロバイダの fetch 自体が呼ばれないようにする。

INSERT INTO public.ui_dashboard_element (element_key, screen, element_type, label, description, sort_order)
SELECT * FROM (
  VALUES
    ('top.feed.task_management', 'top', 'notice', 'タスク管理通知', 'お知らせ内のタスク割当・期限接近・コメント通知', 61)
) AS new_rows(element_key, screen, element_type, label, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ui_dashboard_element e WHERE e.element_key = new_rows.element_key
);

UPDATE public.ui_dashboard_element e
SET service_id = s.id
FROM (
  VALUES
    ('top.feed.task_management', '/tasks')
) AS e_map(element_key, route_path)
JOIN public.service s ON trim(s.route_path) = e_map.route_path
WHERE e.element_key = e_map.element_key;
```

- [ ] **Step 2: 事前確認（route_path='/tasks' のserviceが実在すること）**

対象DBの宣言: これはローカル（`127.0.0.1:55422`）に対する操作である。

マイグレーション適用前に、UPDATE...JOIN の対象になる `service` 行が実在することを確認する（実在しない場合、UPDATE が静かに0件のまま終わり `service_id` が NULL のままになる——エラーにはならないため、事前確認が必須）。

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT id, route_path FROM public.service WHERE trim(route_path) = '/tasks';"`
Expected: 1行返る（Phase 1 のマスタ登録で作成済みのはず）。0行の場合は、先にタスク管理機能の `service` 登録状況を調査してから続行する（このタスクの範囲外の問題であり、コントローラーに報告する）

- [ ] **Step 3: マイグレーションを適用する**

Run: `supabase migration up`
Expected: エラーなく適用完了

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT element_key, service_id FROM public.ui_dashboard_element WHERE element_key = 'top.feed.task_management';"`
Expected: 1行返り、`service_id` が Step 2 で確認した `service.id` と一致する（NULLではない）

- [ ] **Step 4: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`

Run: `head -5 src/lib/supabase/types.ts`
Expected: 1行目が `export type Json =` 等の正常なTypeScriptで始まる（CLI診断行が混入していないこと）。混入していたら `supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts` で再実行する

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_top_feed_task_management_ui_dashboard_element.sql src/lib/supabase/types.ts
git commit -m "feat: タスク管理フィードのui_dashboard_element登録マイグレーションを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 全体テスト実行・手動E2E確認・PRDステータス更新

**Files:**

- Modify: `docs/implementation-plan-task-management.md`

**Interfaces:**

- Consumes: Task 1〜3 で実装した全機能
- Produces: なし（検証・ドキュメント更新タスク）

- [ ] **Step 1: 単体テストを全件実行する**

Run: `npm test`
Expected: 全件PASS（唯一の既知の無関係な既存失敗 `data-migration/parse.test.ts` 以外に失敗が無いこと）

- [ ] **Step 2: 型チェック・Lint**

Run: `npm run type-check && npm run lint`
Expected: エラーなし（変更したファイルについて）

- [ ] **Step 3: 開発サーバーで手動E2E確認する**

対象DBの宣言: これはローカル（`127.0.0.1:55422` / `http://127.0.0.1:55421`）に対する操作である。

Run: `npm run dev`（既に起動している場合は流用する）

以下をブラウザで確認する。

1. 自分がタスクの担当者になっている状態で `/top` を開き、フィードパネルに「担当タスク: 〇〇」という通知が表示されることを確認する（期限が無ければ severity は `action` 相当の見た目、期限が近ければ警告色）
2. `/notifications` 一覧ページでも同じ通知が表示されることを確認する
3. 自分が参加するタスク/タスクグループに、自分以外の従業員がコメントを投稿し、それが3日以内であればフィードに「〇〇さんから...へのコメント」という通知が表示されることを確認する
4. コメント通知は既読化（クリックで既読マーク）できるが、タスク割当通知には既読化ボタンが表示されない（`kind: 'action_prompt'` の仕様通り）ことを確認する
5. 担当タスクを完了（`status: 'done'`）に変更後、フィードから該当の割当通知が消えることを確認する
6. `tenant_service` でタスク管理機能を契約していないテナントでは、本フィード自体が表示されないことを確認する（可能であれば）

ローカルDBにテスト可能なタスク・コメントデータが無い場合は、既存の工数管理機能・進捗サマリ機能のPRD注記と同様に、実施できなかった旨と代替の検証根拠（型チェック・タスクレビュー・ユニットテストによる純粋関数の網羅的検証）を正直に記録する。

- [ ] **Step 4: PRDのステータスを更新する**

`docs/implementation-plan-task-management.md` のセクション16.6「実装ステータス（サブタスク単位）」の全行を「完了」に更新する（手動E2Eが実施できなかった場合は、工数管理機能・進捗サマリ機能の注記と同じスタイルで正直に注記を添える）。セクション12「実装ステータス」のPhase 3行を以下に更新する。

```markdown
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 一部完了（進捗サマリ・通知連携完了／残り2項目は未着手） |
```

- [ ] **Step 5: Commit**

```bash
git add docs/implementation-plan-task-management.md
git commit -m "docs: ダッシュボードフィード連携機能のPRDステータスを更新

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
