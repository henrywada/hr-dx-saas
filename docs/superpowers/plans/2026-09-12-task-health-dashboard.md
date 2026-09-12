# タスク健康度ダッシュボード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テナント管理者（`appRole !== 'employee'`）が `/adm/task-health` で全社のタスク進捗・滞留・負荷偏在・目標別達成状況を俯瞰できるダッシュボードを追加する。

**Architecture:** 既存の`task-management` featureに判定・集計ロジック（純粋関数）とクエリ関数を追加し、`adm/(task_health)/task-health` に新規ページを作る。RLS（`current_employee_app_role() <> 'employee'` で全件許可済み）に任せ、`createClient()`（RLS有効）のみを使う。集計はアプリケーション側（TypeScript）で行う。

**Tech Stack:** Next.js App Router（Server Component）、Supabase（PostgREST）、Recharts、`@/components/ui/DataTable`、date-fns

**Spec:** `docs/implementation-plan-task-management.md` セクション21（Phase 6 詳細設計）

## Global Constraints

- RLSは`createClient()`のみを使う。`createAdminClient()`は絶対に使わない（エンドユーザー向けコードでの利用は絶対禁止）。
- 滞留判定の閾値は14日固定（`STALE_DAYS_THRESHOLD`として定数化、マジックナンバー禁止）。
- 日付比較は`Asia/Tokyo`基準。`src/lib/datetime.ts`の`toJSTDateString()`を使う。
- PostgRESTの1件リクエスト上限1000行に対応するため、テナント全体取得には既存の`fetchAllRows`ヘルパー（`queries.ts`内、モジュールプライベート）を必ず使う。
- 既存の`calculateAverageProgress`/`groupProgressByParent`（`src/features/task-management/progress.ts`）を再利用し、重複実装しない。
- ドリルダウン（個別タスク/目標詳細への遷移）は実装しない（MVPスコープ外）。
- コードコメントは日本語で記述する（プロジェクト規約）。
- ファイル末尾に不要な空行を作らない。既存ファイルへの追記は既存のコードスタイル（インデント・命名）に厳密に合わせる。

---

## File Structure Overview

**新規作成:**

- `src/features/task-management/task-health.ts` — 判定・集計純粋関数
- `src/features/task-management/task-health.test.ts` — 上記のユニットテスト
- `src/features/task-management/components/admin/ProgressOverviewCard.tsx`
- `src/features/task-management/components/admin/StalledTaskListCard.tsx`
- `src/features/task-management/components/admin/WorkloadDistributionCard.tsx`
- `src/features/task-management/components/admin/ObjectiveAchievementCard.tsx`
- `src/features/task-management/components/admin/TaskHealthDashboard.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/page.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/loading.tsx`
- `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/error.tsx`
- `supabase/migrations/<timestamp>_task_health_dashboard_menu.sql`

**変更:**

- `src/features/task-management/queries.ts` — 4関数追加（`getTaskHealthOverview`/`getStalledTasks`/`getWorkloadDistribution`/`getObjectiveAchievementStatus`）+ プライベートヘルパー`resolveFilteredTaskIds`
- `src/features/task-management/permissions.ts` — `isTenantAdmin`追加
- `src/features/task-management/permissions.test.ts` — 上記のテスト追加
- `src/config/routes.ts` — `APP_ROUTES.TENANT.ADMIN_TASK_HEALTH`追加

---

### Task 1: 判定・集計純粋関数（task-health.ts）

**Files:**

- Create: `src/features/task-management/task-health.ts`
- Test: `src/features/task-management/task-health.test.ts`

**Interfaces:**

- Consumes: `TaskStatus`（`./types`からimport、既存）
- Produces:
  - `STALE_DAYS_THRESHOLD: number`
  - `type StalledReason = 'overdue' | 'stale' | 'blocked_long'`
  - `interface StalledTaskCandidate { status: TaskStatus; dueDate: string | null; updatedAt: string }`
  - `function classifyStalledReasons(task: StalledTaskCandidate, todayYmd: string, staleDays?: number): StalledReason[]`
  - `interface StatusCounts { todo: number; in_progress: number; review: number; done: number; blocked: number }`
  - `function summarizeStatusCounts(tasks: { status: TaskStatus }[]): StatusCounts`
  - `interface WorkloadAggregate { employeeId: string; totalCount: number; inProgressCount: number }`
  - `function aggregateWorkloadByEmployee(assignments: { employeeId: string; status: TaskStatus }[]): WorkloadAggregate[]`
  - Task 2はこれらすべてと、`./progress`の既存`calculateAverageProgress`/`groupProgressByParent`を使う。

- [ ] **Step 1: 失敗するテストを書く（classifyStalledReasons）**

`src/features/task-management/task-health.test.ts` を新規作成する：

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyStalledReasons,
  summarizeStatusCounts,
  aggregateWorkloadByEmployee,
  STALE_DAYS_THRESHOLD,
} from './task-health'

test('classifyStalledReasons: 定数は14日', () => {
  assert.equal(STALE_DAYS_THRESHOLD, 14)
})

test('classifyStalledReasons: 期限超過（todo）はoverdueを含む', () => {
  const reasons = classifyStalledReasons(
    { status: 'todo', dueDate: '2026-09-01', updatedAt: '2026-09-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(reasons.includes('overdue'))
})

test('classifyStalledReasons: 期限超過でもdoneはoverdueにならない', () => {
  const reasons = classifyStalledReasons(
    { status: 'done', dueDate: '2026-09-01', updatedAt: '2026-09-14T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('overdue'))
})

test('classifyStalledReasons: 期限超過でもblockedはoverdueにならない（blocked_longの方で拾う）', () => {
  const reasons = classifyStalledReasons(
    { status: 'blocked', dueDate: '2026-09-01', updatedAt: '2026-09-14T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('overdue'))
})

test('classifyStalledReasons: 期限当日はoverdueにならない（超過のみ対象）', () => {
  const reasons = classifyStalledReasons(
    { status: 'todo', dueDate: '2026-09-15', updatedAt: '2026-09-14T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('overdue'))
})

test('classifyStalledReasons: dueDateがnullならoverdueにならない', () => {
  const reasons = classifyStalledReasons(
    { status: 'todo', dueDate: null, updatedAt: '2026-09-14T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('overdue'))
})

test('classifyStalledReasons: 14日以上未更新（in_progress）はstaleを含む', () => {
  const reasons = classifyStalledReasons(
    { status: 'in_progress', dueDate: null, updatedAt: '2026-09-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(reasons.includes('stale'))
})

test('classifyStalledReasons: 13日未更新はstaleにならない（境界値）', () => {
  const reasons = classifyStalledReasons(
    { status: 'in_progress', dueDate: null, updatedAt: '2026-09-02T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('stale'))
})

test('classifyStalledReasons: ちょうど14日未更新はstaleになる（境界値）', () => {
  const reasons = classifyStalledReasons(
    { status: 'in_progress', dueDate: null, updatedAt: '2026-09-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(reasons.includes('stale'))
})

test('classifyStalledReasons: doneは14日未更新でもstaleにならない', () => {
  const reasons = classifyStalledReasons(
    { status: 'done', dueDate: null, updatedAt: '2026-09-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('stale'))
})

test('classifyStalledReasons: blockedが14日以上更新なしならblocked_longを含む', () => {
  const reasons = classifyStalledReasons(
    { status: 'blocked', dueDate: null, updatedAt: '2026-09-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(reasons.includes('blocked_long'))
})

test('classifyStalledReasons: blockedでも13日未更新ならblocked_longにならない', () => {
  const reasons = classifyStalledReasons(
    { status: 'blocked', dueDate: null, updatedAt: '2026-09-02T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(!reasons.includes('blocked_long'))
})

test('classifyStalledReasons: 複数該当時はすべての理由を返す', () => {
  const reasons = classifyStalledReasons(
    { status: 'blocked', dueDate: '2026-09-01', updatedAt: '2026-08-01T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.ok(reasons.includes('blocked_long'))
  assert.ok(reasons.includes('stale'))
  assert.ok(!reasons.includes('overdue'))
})

test('classifyStalledReasons: どれにも該当しなければ空配列', () => {
  const reasons = classifyStalledReasons(
    { status: 'in_progress', dueDate: '2026-12-31', updatedAt: '2026-09-14T00:00:00.000Z' },
    '2026-09-15'
  )
  assert.deepEqual(reasons, [])
})

test('summarizeStatusCounts: 各ステータスの件数を数える', () => {
  const counts = summarizeStatusCounts([
    { status: 'todo' },
    { status: 'todo' },
    { status: 'in_progress' },
    { status: 'done' },
  ])
  assert.deepEqual(counts, { todo: 2, in_progress: 1, review: 0, done: 1, blocked: 0 })
})

test('summarizeStatusCounts: 空配列なら全ステータス0', () => {
  const counts = summarizeStatusCounts([])
  assert.deepEqual(counts, { todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0 })
})

test('aggregateWorkloadByEmployee: 従業員ごとに件数と進行中件数を集計する', () => {
  const result = aggregateWorkloadByEmployee([
    { employeeId: 'e1', status: 'todo' },
    { employeeId: 'e1', status: 'done' },
    { employeeId: 'e2', status: 'in_progress' },
  ])
  const e1 = result.find(r => r.employeeId === 'e1')
  const e2 = result.find(r => r.employeeId === 'e2')
  assert.deepEqual(e1, { employeeId: 'e1', totalCount: 2, inProgressCount: 1 })
  assert.deepEqual(e2, { employeeId: 'e2', totalCount: 1, inProgressCount: 1 })
})

test('aggregateWorkloadByEmployee: reviewもinProgressCountに含める', () => {
  const result = aggregateWorkloadByEmployee([{ employeeId: 'e1', status: 'review' }])
  assert.deepEqual(result, [{ employeeId: 'e1', totalCount: 1, inProgressCount: 1 }])
})

test('aggregateWorkloadByEmployee: 空配列なら空配列', () => {
  assert.deepEqual(aggregateWorkloadByEmployee([]), [])
})
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

Run: `node --import tsx --test src/features/task-management/task-health.test.ts`
Expected: FAIL（`task-health.ts` が存在しないため `Cannot find module './task-health'`）

- [ ] **Step 3: 最小限の実装を書く**

`src/features/task-management/task-health.ts` を新規作成する：

```typescript
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { toJSTDateString } from '@/lib/datetime'
import { TASK_STATUSES, type TaskStatus } from './types'

/** 「長期未更新」「blocked長期滞在」の日数基準（PRDセクション21.1で決定） */
export const STALE_DAYS_THRESHOLD = 14

export type StalledReason = 'overdue' | 'stale' | 'blocked_long'

export interface StalledTaskCandidate {
  status: TaskStatus
  dueDate: string | null
  updatedAt: string
}

/**
 * タスクが「滞留」に該当するか判定し、該当する理由をすべて返す（複数該当し得る）。
 * - overdue: 期限が過ぎており、done/blocked以外
 * - stale: 14日以上更新が無く、done以外
 * - blocked_long: blockedのまま14日以上更新が無い
 */
export function classifyStalledReasons(
  task: StalledTaskCandidate,
  todayYmd: string,
  staleDays: number = STALE_DAYS_THRESHOLD
): StalledReason[] {
  const reasons: StalledReason[] = []

  if (
    task.dueDate &&
    task.dueDate < todayYmd &&
    task.status !== 'done' &&
    task.status !== 'blocked'
  ) {
    reasons.push('overdue')
  }

  const updatedYmd = toJSTDateString(new Date(task.updatedAt))
  const daysSinceUpdate = differenceInCalendarDays(parseISO(todayYmd), parseISO(updatedYmd))

  if (task.status !== 'done' && daysSinceUpdate >= staleDays) {
    reasons.push('stale')
  }

  if (task.status === 'blocked' && daysSinceUpdate >= staleDays) {
    reasons.push('blocked_long')
  }

  return reasons
}

export type StatusCounts = Record<TaskStatus, number>

/** タスクのステータス別件数を集計する（該当0件のステータスも0として含む） */
export function summarizeStatusCounts(tasks: { status: TaskStatus }[]): StatusCounts {
  const counts = Object.fromEntries(TASK_STATUSES.map(s => [s, 0])) as StatusCounts
  for (const task of tasks) {
    counts[task.status] += 1
  }
  return counts
}

export interface WorkloadAggregate {
  employeeId: string
  totalCount: number
  inProgressCount: number
}

/** 進行中とみなすステータス（todo/in_progress/review）。done/blockedは含めない */
const IN_PROGRESS_STATUSES: ReadonlySet<TaskStatus> = new Set(['todo', 'in_progress', 'review'])

/** 従業員ごとの担当タスク件数・うち進行中件数を集計する */
export function aggregateWorkloadByEmployee(
  assignments: { employeeId: string; status: TaskStatus }[]
): WorkloadAggregate[] {
  const byEmployee = new Map<string, WorkloadAggregate>()

  for (const a of assignments) {
    const existing = byEmployee.get(a.employeeId) ?? {
      employeeId: a.employeeId,
      totalCount: 0,
      inProgressCount: 0,
    }
    existing.totalCount += 1
    if (IN_PROGRESS_STATUSES.has(a.status)) {
      existing.inProgressCount += 1
    }
    byEmployee.set(a.employeeId, existing)
  }

  return Array.from(byEmployee.values())
}
```

- [ ] **Step 4: テストを実行して成功することを確認する**

Run: `node --import tsx --test src/features/task-management/task-health.test.ts`
Expected: 全テストPASS

- [ ] **Step 5: 型チェックとlintを確認する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/task-health.ts src/features/task-management/task-health.test.ts
git commit -m "feat: タスク健康度の判定・集計純粋関数を追加"
```

---

### Task 2: 権限判定関数（isTenantAdmin）

**Files:**

- Modify: `src/features/task-management/permissions.ts`
- Test: `src/features/task-management/permissions.test.ts`（無ければ新規作成）

**Interfaces:**

- Produces: `function isTenantAdmin(appRole: string | undefined): boolean`
- Consumes: なし

- [ ] **Step 1: 既存テストファイルの有無を確認する**

Run: `ls src/features/task-management/permissions.test.ts 2>&1 || echo "NOT_FOUND"`

ファイルが存在すれば末尾に追記、存在しなければ新規作成する（既存の`kanban.test.ts`と同じ`node:test`スタイル）。

- [ ] **Step 2: 失敗するテストを書く**

`src/features/task-management/permissions.test.ts` に以下を追記（新規作成の場合は`import assert from 'node:assert/strict'` と `import test from 'node:test'` を先頭に、既存importに続けて `isTenantAdmin` を追加）：

```typescript
import { isTenantAdmin } from './permissions'

test('isTenantAdmin: employee以外はtrue', () => {
  assert.equal(isTenantAdmin('hr'), true)
  assert.equal(isTenantAdmin('tenant_admin'), true)
  assert.equal(isTenantAdmin('developer'), true)
})

test('isTenantAdmin: employeeはfalse', () => {
  assert.equal(isTenantAdmin('employee'), false)
})

test('isTenantAdmin: undefined（従業員レコード無し等）はfalse', () => {
  assert.equal(isTenantAdmin(undefined), false)
})
```

- [ ] **Step 3: テストを実行して失敗することを確認する**

Run: `node --import tsx --test src/features/task-management/permissions.test.ts`
Expected: FAIL（`isTenantAdmin` が存在しない）

- [ ] **Step 4: 実装を追加する**

`src/features/task-management/permissions.ts` の末尾に追記：

```typescript
/**
 * テナント管理者相当か（`app_role.app_role !== 'employee'`）。
 * CLAUDE.mdの権限モデル定義に準拠。RLS側も同条件で最終防衛済み
 * （PRDセクション21.2）。
 */
export function isTenantAdmin(appRole: string | undefined): boolean {
  return appRole !== undefined && appRole !== 'employee'
}
```

- [ ] **Step 5: テストを実行して成功することを確認する**

Run: `node --import tsx --test src/features/task-management/permissions.test.ts`
Expected: 全テストPASS

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/permissions.ts src/features/task-management/permissions.test.ts
git commit -m "feat: テナント管理者判定関数isTenantAdminを追加"
```

---

### Task 3: ルート定数の追加

**Files:**

- Modify: `src/config/routes.ts`

**Interfaces:**

- Produces: `APP_ROUTES.TENANT.ADMIN_TASK_HEALTH: '/adm/task-health'`

- [ ] **Step 1: 既存の`ADMIN_OKR_DASHBOARD`定義を確認する**

Run: `grep -n "ADMIN_OKR_DASHBOARD" src/config/routes.ts`

既存の並び（`TENANT`オブジェクト内、`ADMIN_OKR_DASHBOARD: '/adm/okr',` の直後）を確認する。

- [ ] **Step 2: ルート定数を追加する**

`src/config/routes.ts` の `ADMIN_OKR_DETAIL: (objectiveId: string) => \`/adm/okr/${objectiveId}\`,` の行の直後に追記：

```typescript
    /** タスク健康度ダッシュボード（組織横断のタスク進捗・滞留・負荷偏在の可視化） */
    ADMIN_TASK_HEALTH: '/adm/task-health',
```

- [ ] **Step 3: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat: タスク健康度ダッシュボードのルート定数を追加"
```

---

### Task 4: クエリ関数（queries.ts拡張）

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes:
  - `classifyStalledReasons`, `summarizeStatusCounts`, `aggregateWorkloadByEmployee`, `STALE_DAYS_THRESHOLD`（Task 1、`./task-health`）
  - `calculateAverageProgress`, `groupProgressByParent`（既存、`./progress`。すでに12行目でimport済み）
  - `toJSTDateString`（既存、`@/lib/datetime`）
  - `fetchAllRows`（同ファイル内の既存プライベート関数、42行目）
- Produces:
  - `interface TaskHealthOverview { statusCounts: StatusCounts; averageProgress: number; totalCount: number }`
  - `function getTaskHealthOverview(supabase, options?: { divisionId?: string }): Promise<TaskHealthOverview>`
  - `interface StalledTaskRow { id: string; title: string; status: TaskStatus; dueDate: string | null; updatedAt: string; responsibleName: string | null; reasons: StalledReason[] }`
  - `function getStalledTasks(supabase, options?: { divisionId?: string }): Promise<StalledTaskRow[]>`
  - `interface WorkloadRow { employeeId: string; employeeName: string; totalCount: number; inProgressCount: number }`
  - `function getWorkloadDistribution(supabase, options?: { divisionId?: string }): Promise<WorkloadRow[]>`
  - `interface ObjectiveAchievementRow { objectiveId: string; objectiveTitle: string; responsibleName: string; averageProgress: number; delayedTaskCount: number }`
  - `function getObjectiveAchievementStatus(supabase, options?: { divisionId?: string }): Promise<ObjectiveAchievementRow[]>`

このタスクはSupabase実DBに依存するクエリのため、ユニットテストではなくローカルSupabase実DBに対する動作確認で検証する（PRDセクション21.6、既存パターンと同様）。

- [ ] **Step 1: importを追加する**

`src/features/task-management/queries.ts` の12行目 `import { calculateAverageProgress, groupProgressByParent } from './progress'` の直後に追記：

```typescript
import {
  classifyStalledReasons,
  summarizeStatusCounts,
  aggregateWorkloadByEmployee,
  type StalledReason,
} from './task-health'
import { toJSTDateString } from '@/lib/datetime'
```

（`TaskStatus`は既にファイル内で参照されている前提。無ければ `import type { TaskStatus } from './types'` も合わせて追加する。`grep -n "TaskStatus" src/features/task-management/queries.ts` で既存importを確認してから重複させないこと。）

- [ ] **Step 2: 部門フィルタ用のプライベートヘルパーを追加する**

ファイル末尾（最後のexport関数の後）に追記：

```typescript
/**
 * 部門フィルタに該当するタスクIDの集合を解決する。
 * - divisionIdが未指定なら絞り込みなし（null を返す）
 * - 'unassigned' は部署未配属（division_id が null）の担当者を意味する
 * - 該当タスクが1件も無ければ空配列を返す（呼び出し側はその場で空の結果を返してよい）
 *
 * 絞り込みは「タスクの担当者（task_assignees.employee_id）の所属部署」基準
 * （タスク自体はどの部署にも属さないため。PRDセクション21.1）。
 */
async function resolveFilteredTaskIds(
  supabase: SupabaseClient<Database>,
  divisionId: string | undefined
): Promise<string[] | null> {
  if (!divisionId) return null

  const { data: employees, error: employeeError } = await supabase
    .from('employees')
    .select('id, division_id')

  if (employeeError) throw employeeError

  const targetEmployeeIds = (employees ?? [])
    .filter(e =>
      divisionId === 'unassigned' ? e.division_id === null : e.division_id === divisionId
    )
    .map(e => e.id)

  if (targetEmployeeIds.length === 0) return []

  const assigneeRows = await fetchAllRows(async (from, to) => {
    const result = await supabase
      .from('task_assignees')
      .select('task_id')
      .in('employee_id', targetEmployeeIds)
      .order('id', { ascending: true })
      .range(from, to)
    return { data: result.data, error: result.error }
  })

  return Array.from(new Set(assigneeRows.map(r => r.task_id)))
}
```

- [ ] **Step 3: `getTaskHealthOverview` を追加する**

続けて追記：

```typescript
export interface TaskHealthOverview {
  statusCounts: StatusCounts
  averageProgress: number
  totalCount: number
}

/** テナント全体（部門絞り込み可）のタスクステータス別件数・平均進捗率を取得する */
export async function getTaskHealthOverview(
  supabase: SupabaseClient<Database>,
  options: { divisionId?: string } = {}
): Promise<TaskHealthOverview> {
  const taskIds = await resolveFilteredTaskIds(supabase, options.divisionId)
  if (taskIds !== null && taskIds.length === 0) {
    return { statusCounts: summarizeStatusCounts([]), averageProgress: 0, totalCount: 0 }
  }

  const rows = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('tasks')
      .select('status, progress_percent')
      .order('id', { ascending: true })
      .range(from, to)
    if (taskIds !== null) query = query.in('id', taskIds)
    const result = await query
    return { data: result.data, error: result.error }
  })

  return {
    statusCounts: summarizeStatusCounts(rows.map(r => ({ status: r.status as TaskStatus }))),
    averageProgress: calculateAverageProgress(rows.map(r => r.progress_percent)),
    totalCount: rows.length,
  }
}
```

`StatusCounts` 型がまだ`queries.ts`にimportされていない場合は、Step 1のimportに `type StatusCounts` を追加すること（`import { classifyStalledReasons, summarizeStatusCounts, aggregateWorkloadByEmployee, type StalledReason, type StatusCounts } from './task-health'`）。

- [ ] **Step 4: `getStalledTasks` を追加する**

続けて追記：

```typescript
export interface StalledTaskRow {
  id: string
  title: string
  status: TaskStatus
  dueDate: string | null
  updatedAt: string
  responsibleName: string | null
  reasons: StalledReason[]
}

interface StalledTaskQueryRow {
  id: string
  title: string
  status: string
  due_date: string | null
  updated_at: string
  task_assignees: { role: string; employee: { name: string | null } | null }[] | null
}

/** テナント全体（部門絞り込み可）の滞留タスク一覧を取得する（該当理由付き、非該当は除外） */
export async function getStalledTasks(
  supabase: SupabaseClient<Database>,
  options: { divisionId?: string } = {}
): Promise<StalledTaskRow[]> {
  const taskIds = await resolveFilteredTaskIds(supabase, options.divisionId)
  if (taskIds !== null && taskIds.length === 0) return []

  const rows = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('tasks')
      .select(
        'id, title, status, due_date, updated_at, task_assignees(role, employee:employee_id(name))'
      )
      .order('id', { ascending: true })
      .range(from, to)
    if (taskIds !== null) query = query.in('id', taskIds)
    const result = await query
    return { data: result.data as unknown as StalledTaskQueryRow[] | null, error: result.error }
  })

  const todayYmd = toJSTDateString()

  return rows
    .map((row): StalledTaskRow | null => {
      const reasons = classifyStalledReasons(
        { status: row.status as TaskStatus, dueDate: row.due_date, updatedAt: row.updated_at },
        todayYmd
      )
      if (reasons.length === 0) return null

      const responsible = (row.task_assignees ?? []).find(a => a.role === 'responsible')

      return {
        id: row.id,
        title: row.title,
        status: row.status as TaskStatus,
        dueDate: row.due_date,
        updatedAt: row.updated_at,
        responsibleName: responsible?.employee?.name ?? null,
        reasons,
      }
    })
    .filter((r): r is StalledTaskRow => r !== null)
}
```

- [ ] **Step 5: `getWorkloadDistribution` を追加する**

続けて追記：

```typescript
export interface WorkloadRow {
  employeeId: string
  employeeName: string
  totalCount: number
  inProgressCount: number
}

interface WorkloadQueryRow {
  employee_id: string
  employee: { name: string | null } | null
  task: { status: string } | null
}

/** テナント全体（部門絞り込み可）の担当者別タスク件数・進行中件数を取得する */
export async function getWorkloadDistribution(
  supabase: SupabaseClient<Database>,
  options: { divisionId?: string } = {}
): Promise<WorkloadRow[]> {
  const taskIds = await resolveFilteredTaskIds(supabase, options.divisionId)
  if (taskIds !== null && taskIds.length === 0) return []

  const rows = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('task_assignees')
      .select('employee_id, employee:employee_id(name), task:task_id!inner(status)')
      .order('id', { ascending: true })
      .range(from, to)
    if (taskIds !== null) query = query.in('task_id', taskIds)
    const result = await query
    return { data: result.data as unknown as WorkloadQueryRow[] | null, error: result.error }
  })

  const nameById = new Map(rows.map(r => [r.employee_id, r.employee?.name ?? '（名前未設定）']))

  const aggregated = aggregateWorkloadByEmployee(
    rows
      .filter((r): r is WorkloadQueryRow & { task: { status: string } } => r.task !== null)
      .map(r => ({ employeeId: r.employee_id, status: r.task.status as TaskStatus }))
  )

  return aggregated
    .map(a => ({ ...a, employeeName: nameById.get(a.employeeId) ?? a.employeeId }))
    .sort((a, b) => b.totalCount - a.totalCount)
}
```

- [ ] **Step 6: `getObjectiveAchievementStatus` を追加する**

続けて追記（`getMyObjectivesWithProgress` と同じ「milestone→objectiveマップを先に作る」手法を踏襲する）：

```typescript
export interface ObjectiveAchievementRow {
  objectiveId: string
  objectiveTitle: string
  responsibleName: string
  averageProgress: number
  delayedTaskCount: number
}

interface ObjectiveTaskQueryRow {
  progress_percent: number
  due_date: string | null
  status: string
  task_group: { milestone_id: string } | null
}

/** テナント全体（部門絞り込み可）の目標別の配下タスク平均進捗率・遅延タスク件数を取得する */
export async function getObjectiveAchievementStatus(
  supabase: SupabaseClient<Database>,
  options: { divisionId?: string } = {}
): Promise<ObjectiveAchievementRow[]> {
  const taskIds = await resolveFilteredTaskIds(supabase, options.divisionId)
  if (taskIds !== null && taskIds.length === 0) return []

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id, objective_id')

  if (milestoneError) throw milestoneError

  const objectiveIdByMilestoneId = new Map((milestoneRows ?? []).map(m => [m.id, m.objective_id]))

  const taskRows = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('tasks')
      .select('progress_percent, due_date, status, task_group:task_group_id!inner(milestone_id)')
      .order('id', { ascending: true })
      .range(from, to)
    if (taskIds !== null) query = query.in('id', taskIds)
    const result = await query
    return { data: result.data as unknown as ObjectiveTaskQueryRow[] | null, error: result.error }
  })

  const todayYmd = toJSTDateString()
  const progressRows: { value: number; parentId: string }[] = []
  const delayedCountByObjectiveId = new Map<string, number>()

  for (const row of taskRows) {
    const milestoneId = row.task_group?.milestone_id
    const objectiveId = milestoneId ? objectiveIdByMilestoneId.get(milestoneId) : undefined
    if (!objectiveId) continue

    progressRows.push({ value: row.progress_percent, parentId: objectiveId })

    const reasons = classifyStalledReasons(
      { status: row.status as TaskStatus, dueDate: row.due_date, updatedAt: todayYmd },
      todayYmd
    )
    if (reasons.includes('overdue')) {
      delayedCountByObjectiveId.set(
        objectiveId,
        (delayedCountByObjectiveId.get(objectiveId) ?? 0) + 1
      )
    }
  }

  const objectiveIds = Array.from(new Set(progressRows.map(r => r.parentId)))
  if (objectiveIds.length === 0) return []

  const averageProgressByObjectiveId = groupProgressByParent(progressRows, objectiveIds)

  const { data: objectiveRows, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('id, title, owner_employee_id, employee:owner_employee_id(name)')
    .in('id', objectiveIds)

  if (objectiveError) throw objectiveError

  const metaById = new Map(
    (objectiveRows ?? []).map(o => [
      o.id,
      {
        title: o.title,
        responsibleName: (o.employee as { name: string | null } | null)?.name ?? '（名前未設定）',
      },
    ])
  )

  return objectiveIds.map(objectiveId => {
    const meta = metaById.get(objectiveId)
    return {
      objectiveId,
      objectiveTitle: meta?.title ?? '（不明な目標）',
      responsibleName: meta?.responsibleName ?? '（不明）',
      averageProgress: averageProgressByObjectiveId[objectiveId] ?? 0,
      delayedTaskCount: delayedCountByObjectiveId.get(objectiveId) ?? 0,
    }
  })
}
```

`classifyStalledReasons`の`updatedAt`に`todayYmd`を渡しているのは、ここでは「期限超過（overdue）」の判定だけが目的で`stale`/`blocked_long`の結果は使わないため（`updatedAt`が今日ならstale/blocked_longは常にfalseになり、副作用なくoverdueだけを取り出せる）。

- [ ] **Step 7: 型チェック・lintを確認する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし。`queries.ts`に既存の`no-explicit-any`等の警告があっても、今回追加した箇所に新規のエラーが出ていないことを確認する（`npm run lint 2>&1 | grep queries.ts`）。

- [ ] **Step 8: ローカルSupabase実DBで動作確認する**

Run:

```bash
supabase status 2>&1 | head -5
```

起動していなければ `supabase start` する。起動していたら、Node REPLまたは一時スクリプトで4関数を実際に呼び出し、エラーなく結果が返ることを確認する。例えば以下を`/tmp`ではなくスクラッチパッドに一時ファイルとして作成し実行する（動作確認後は削除してよい）：

```typescript
// 動作確認用（コミットしない）
import { createClient } from '@supabase/supabase-js'
import {
  getTaskHealthOverview,
  getStalledTasks,
  getWorkloadDistribution,
  getObjectiveAchievementStatus,
} from '../src/features/task-management/queries'

const supabase = createClient('http://127.0.0.1:55421', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

async function main() {
  console.log(await getTaskHealthOverview(supabase))
  console.log(await getStalledTasks(supabase))
  console.log(await getWorkloadDistribution(supabase))
  console.log(await getObjectiveAchievementStatus(supabase))
}

main()
```

RLSを有効なまま検証したい場合はservice_role keyではなく、既存のテストユーザーでサインインしたセッションのanon keyクライアントを使う（`test1@example.test` / `LocalDev#2026`、CLAUDE.md参照）。エラーが出た場合はここで解消してから次のタスクへ進む。

- [ ] **Step 9: コミット**

```bash
git add src/features/task-management/queries.ts
git commit -m "feat: タスク健康度ダッシュボード用のクエリ関数を追加"
```

---

### Task 5: ProgressOverviewCard

**Files:**

- Create: `src/features/task-management/components/admin/ProgressOverviewCard.tsx`

**Interfaces:**

- Consumes: `TaskHealthOverview`（Task 4、`../../queries`からimport）
- Produces: `function ProgressOverviewCard({ overview }: { overview: TaskHealthOverview }): JSX.Element`

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TASK_STATUSES, type TaskStatus } from '../../types'
import type { TaskHealthOverview } from '../../queries'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#FD7601',
  review: '#eab308',
  done: '#1a8754',
  blocked: '#ef4444',
}

interface ProgressOverviewCardProps {
  overview: TaskHealthOverview
}

/** テナント全体のタスクステータス分布・平均進捗率を表示するカード */
export function ProgressOverviewCard({ overview }: ProgressOverviewCardProps) {
  const data = TASK_STATUSES.map(status => ({
    status,
    label: STATUS_LABEL[status],
    value: overview.statusCounts[status],
  })).filter(d => d.value > 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">進捗概要</h2>
        <p className="text-xs text-slate-500">
          全{overview.totalCount}件・平均進捗{overview.averageProgress}%
        </p>
      </div>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">対象のタスクがありません。</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80}>
              {data.map(d => (
                <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/components/admin/ProgressOverviewCard.tsx
git commit -m "feat: 進捗概要カードを追加"
```

---

### Task 6: StalledTaskListCard

**Files:**

- Create: `src/features/task-management/components/admin/StalledTaskListCard.tsx`

**Interfaces:**

- Consumes: `StalledTaskRow`, `StalledReason`（Task 4/1）、`Column`/`DataTable`（`@/components/ui/DataTable`）
- Produces: `function StalledTaskListCard({ tasks }: { tasks: StalledTaskRow[] }): JSX.Element`

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { StalledTaskRow } from '../../queries'
import type { StalledReason } from '../../task-health'
import type { TaskStatus } from '../../types'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const REASON_LABEL: Record<StalledReason, string> = {
  overdue: '期限超過',
  stale: '長期未更新',
  blocked_long: '保留長期化',
}

const REASON_BADGE_CLASS: Record<StalledReason, string> = {
  overdue: 'bg-red-50 text-red-600',
  stale: 'bg-amber-50 text-amber-600',
  blocked_long: 'bg-slate-100 text-slate-600',
}

interface StalledTaskListCardProps {
  tasks: StalledTaskRow[]
}

function ReasonBadges({ reasons }: { reasons: StalledReason[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map(reason => (
        <span
          key={reason}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REASON_BADGE_CLASS[reason]}`}
        >
          {REASON_LABEL[reason]}
        </span>
      ))}
    </div>
  )
}

const columns: Column<StalledTaskRow>[] = [
  { key: 'title', label: 'タスク名', sortable: true },
  {
    key: 'status',
    label: 'ステータス',
    render: (value: TaskStatus) => STATUS_LABEL[value],
  },
  { key: 'dueDate', label: '期限', render: (value: string | null) => value ?? '未設定' },
  {
    key: 'responsibleName',
    label: '責任者',
    render: (value: string | null) => value ?? '未設定',
  },
  {
    key: 'reasons',
    label: '滞留理由',
    render: (value: StalledReason[]) => <ReasonBadges reasons={value} />,
  },
]

/** 滞留タスク（期限超過・長期未更新・保留長期化）の一覧カード */
export function StalledTaskListCard({ tasks }: StalledTaskListCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">滞留タスク（{tasks.length}件）</h2>
      <div className="mt-3">
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-500">滞留しているタスクはありません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            getRowId={t => t.id}
            searchable
            searchKey="title"
            searchPlaceholder="タスク名で検索..."
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/components/admin/StalledTaskListCard.tsx
git commit -m "feat: 滞留タスク一覧カードを追加"
```

---

### Task 7: WorkloadDistributionCard

**Files:**

- Create: `src/features/task-management/components/admin/WorkloadDistributionCard.tsx`

**Interfaces:**

- Consumes: `WorkloadRow`（Task 4）
- Produces: `function WorkloadDistributionCard({ workload }: { workload: WorkloadRow[] }): JSX.Element`

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WorkloadRow } from '../../queries'

interface WorkloadDistributionCardProps {
  workload: WorkloadRow[]
}

/** 担当者別の担当タスク件数・進行中件数を横棒グラフで表示するカード */
export function WorkloadDistributionCard({ workload }: WorkloadDistributionCardProps) {
  // 上位20名に絞る（テナント規模が大きい場合にグラフが縦に伸びすぎないようにするため）
  const data = workload.slice(0, 20)
  const labelById = new Map(data.map(d => [d.employeeId, d.employeeName]))
  const formatLabel = (id: string) => labelById.get(id) ?? id

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">担当者別負荷（上位{data.length}名）</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">担当タスクを持つ従業員がいません。</p>
      ) : (
        <div className="mt-3 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="employeeId"
                width={100}
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={formatLabel}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}件`,
                  name === 'totalCount' ? '担当件数' : '進行中件数',
                ]}
                labelFormatter={formatLabel}
              />
              <Bar dataKey="totalCount" fill="#94a3b8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="inProgressCount" fill="#FD7601" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/components/admin/WorkloadDistributionCard.tsx
git commit -m "feat: 担当者別負荷偏在カードを追加"
```

---

### Task 8: ObjectiveAchievementCard

**Files:**

- Create: `src/features/task-management/components/admin/ObjectiveAchievementCard.tsx`

**Interfaces:**

- Consumes: `ObjectiveAchievementRow`（Task 4）、`Column`/`DataTable`
- Produces: `function ObjectiveAchievementCard({ objectives }: { objectives: ObjectiveAchievementRow[] }): JSX.Element`

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ObjectiveAchievementRow } from '../../queries'

const columns: Column<ObjectiveAchievementRow>[] = [
  { key: 'objectiveTitle', label: '目標名', sortable: true },
  { key: 'responsibleName', label: '責任者' },
  {
    key: 'averageProgress',
    label: '平均進捗率',
    sortable: true,
    render: (value: number) => `${value}%`,
  },
  {
    key: 'delayedTaskCount',
    label: '遅延タスク数',
    sortable: true,
    render: (value: number) =>
      value > 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
          {value}件
        </span>
      ) : (
        <span className="text-xs text-slate-400">0件</span>
      ),
  },
]

interface ObjectiveAchievementCardProps {
  objectives: ObjectiveAchievementRow[]
}

/** 目標別の配下タスク平均進捗率・遅延タスク件数の一覧カード */
export function ObjectiveAchievementCard({ objectives }: ObjectiveAchievementCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">
        目標別達成状況（{objectives.length}件）
      </h2>
      <div className="mt-3">
        {objectives.length === 0 ? (
          <p className="text-xs text-slate-500">対象の目標がありません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={objectives}
            getRowId={o => o.objectiveId}
            searchable
            searchKey="objectiveTitle"
            searchPlaceholder="目標名で検索..."
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/components/admin/ObjectiveAchievementCard.tsx
git commit -m "feat: 目標別達成状況カードを追加"
```

---

### Task 9: TaskHealthDashboard（親コンポーネント・部門フィルタ）

**Files:**

- Create: `src/features/task-management/components/admin/TaskHealthDashboard.tsx`

**Interfaces:**

- Consumes:
  - `ProgressOverviewCard`（Task 5）, `StalledTaskListCard`（Task 6）, `WorkloadDistributionCard`（Task 7）, `ObjectiveAchievementCard`（Task 8）
  - `TaskHealthOverview`, `StalledTaskRow`, `WorkloadRow`, `ObjectiveAchievementRow`（Task 4）
  - `DivisionOption`（既存、`../../queries`）
- Produces: `function TaskHealthDashboard(props: TaskHealthDashboardProps): JSX.Element`（部門選択のURL同期を担う。データ取得はpage.tsx側が行い、選択divisionが変わるたびpage.tsxがサーバー側で再取得する構成にする＝Server Componentの再フェッチをNext.jsのsearchParamsで駆動する。このコンポーネント自体はクライアントの`<select>`操作でURLの`?division=`を書き換えるだけで、データ取得ロジックは持たない）

- [ ] **Step 1: コンポーネントを作成する**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ProgressOverviewCard } from './ProgressOverviewCard'
import { StalledTaskListCard } from './StalledTaskListCard'
import { WorkloadDistributionCard } from './WorkloadDistributionCard'
import { ObjectiveAchievementCard } from './ObjectiveAchievementCard'
import type {
  TaskHealthOverview,
  StalledTaskRow,
  WorkloadRow,
  ObjectiveAchievementRow,
  DivisionOption,
} from '../../queries'

interface TaskHealthDashboardProps {
  overview: TaskHealthOverview
  stalledTasks: StalledTaskRow[]
  workload: WorkloadRow[]
  objectiveAchievements: ObjectiveAchievementRow[]
  divisions: DivisionOption[]
  selectedDivisionId: string | null
}

/** タスク健康度ダッシュボードの部門フィルタ + 4カードの並び */
export function TaskHealthDashboard({
  overview,
  stalledTasks,
  workload,
  objectiveAchievements,
  divisions,
  selectedDivisionId,
}: TaskHealthDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('division')
    } else {
      params.set('division', value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">タスク健康度</h1>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          部門
          <select
            value={selectedDivisionId ?? ''}
            onChange={e => handleDivisionChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="">全社</option>
            <option value="unassigned">未配属</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ProgressOverviewCard overview={overview} />
        <WorkloadDistributionCard workload={workload} />
      </div>

      <StalledTaskListCard tasks={stalledTasks} />
      <ObjectiveAchievementCard objectives={objectiveAchievements} />
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを確認する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/components/admin/TaskHealthDashboard.tsx
git commit -m "feat: タスク健康度ダッシュボードの親コンポーネントを追加"
```

---

### Task 10: ページ本体（page.tsx / loading.tsx / error.tsx）

**Files:**

- Create: `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/page.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/loading.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/error.tsx`

**Interfaces:**

- Consumes:
  - `getServerUser`（`@/lib/auth/server-user`）
  - `isTenantAdmin`（Task 2、`@/features/task-management/permissions`）
  - `createClient`（`@/lib/supabase/server`）
  - `getTaskHealthOverview`, `getStalledTasks`, `getWorkloadDistribution`, `getObjectiveAchievementStatus`, `getTenantDivisions`（Task 4・既存、`@/features/task-management/queries`）
  - `TaskHealthDashboard`（Task 9）
  - `APP_ROUTES`（Task 3、`@/config/routes`）

- [ ] **Step 1: page.tsxを作成する**

既存の`(okr)/okr/page.tsx`と同じ「未認証はログインへ、権限不足はテナントトップへredirect」パターンに合わせる：

```tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { isTenantAdmin } from '@/features/task-management/permissions'
import {
  getTaskHealthOverview,
  getStalledTasks,
  getWorkloadDistribution,
  getObjectiveAchievementStatus,
  getTenantDivisions,
} from '@/features/task-management/queries'
import { TaskHealthDashboard } from '@/features/task-management/components/admin/TaskHealthDashboard'

export const metadata = { title: 'タスク健康度' }

interface TaskHealthPageProps {
  searchParams: Promise<{ division?: string }>
}

export default async function TaskHealthPage({ searchParams }: TaskHealthPageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!isTenantAdmin(user.appRole)) redirect(APP_ROUTES.TENANT.ADMIN)

  const { division } = await searchParams
  const divisionId = division && division.length > 0 ? division : undefined

  const supabase = await createClient()

  const [overview, stalledTasks, workload, objectiveAchievements, divisions] = await Promise.all([
    getTaskHealthOverview(supabase, { divisionId }),
    getStalledTasks(supabase, { divisionId }),
    getWorkloadDistribution(supabase, { divisionId }),
    getObjectiveAchievementStatus(supabase, { divisionId }),
    getTenantDivisions(supabase),
  ])

  return (
    <TaskHealthDashboard
      overview={overview}
      stalledTasks={stalledTasks}
      workload={workload}
      objectiveAchievements={objectiveAchievements}
      divisions={divisions}
      selectedDivisionId={divisionId ?? null}
    />
  )
}
```

- [ ] **Step 2: loading.tsxを作成する**

既存の他adm配下ページの`loading.tsx`パターン（`LoadingSpinner`共通コンポーネント）に合わせる。まず既存例を確認する：

Run: `cat "src/app/(tenant)/(tenant-admin)/adm/(okr)/okr/loading.tsx"`

その内容と同じ構造で作成する（`LoadingSpinner`のimportパスをそのまま流用）。

- [ ] **Step 3: error.tsxを作成する**

既存の`(okr)/okr/error.tsx`の内容を確認し、同じ構造で作成する：

Run: `cat "src/app/(tenant)/(tenant-admin)/adm/(okr)/okr/error.tsx"`

- [ ] **Step 4: 型チェック・lintを確認する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add "src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/"
git commit -m "feat: タスク健康度ダッシュボードのページを追加"
```

---

### Task 11: マスタ登録マイグレーション

**Files:**

- Create: `supabase/migrations/<timestamp>_task_health_dashboard_menu.sql`（`<timestamp>`は作成時刻、`date -u +%Y%m%d%H%M%S`で生成）

**Interfaces:**

- Consumes: なし（DBスキーマのみ）
- Produces: `service_category`「タスク健康度」、`service`（route_path `/adm/task-health`）、`service_class_index`（「評価・成長」service_classへの紐付け）、`tenant_service`（全テナント有効化）

`app_role_service`へは登録しない（grant_notifierの実装コメントの通り、未登録＝役割制限なし＝テナント管理者の全役割で表示される。PRDセクション21.5をこの実装知見に合わせて修正する）。

- [ ] **Step 1: 対象データベースを宣言する**

これは**ローカル（127.0.0.1:55422）に対する操作**である。本番への適用はこのタスクの範囲外（ユーザーが別途 `supabase db push` を承認した場合のみ行う）。

- [ ] **Step 2: 固定UUIDを生成する**

Run:

```bash
python3 -c "import uuid; print('category:', uuid.uuid4()); print('service:', uuid.uuid4())"
```

出力されたUUID2個を以下のSQLの `v_category_id` / `v_service_id` に埋め込む（環境間で一致させるため、実行のたびに変えず、生成した値をそのままコミットする）。

- [ ] **Step 3: マイグレーションファイルを作成する**

`supabase/migrations/<timestamp>_task_health_dashboard_menu.sql`：

```sql
-- =============================================================================
-- タスク健康度ダッシュボード（テナント管理者向け、/adm/task-health）のメニュー登録
--
-- 新規カテゴリとして「タスク健康度」を新設する（既存の /adm/okr は
-- src/features/okr/ という完全に別モジュールであり無関係、PRD セクション21.0）。
-- サイドメニュー大分類は既存の「評価・成長」（sort_order 1400）に相乗りする。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。grant_notifier マイグレーションの
-- 実装知見に合わせる）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するレコードのid（環境間で揃える。python3 -c "import uuid; print(uuid.uuid4())" で生成した値）
  v_category_id CONSTANT uuid := '<ここに生成したcategory UUIDを貼る>';
  v_service_id  CONSTANT uuid := '<ここに生成したservice UUIDを貼る>';

  v_class_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- サイドメニュー大分類「評価・成長」を解決する ----
  SELECT id INTO v_class_id
  FROM public.service_class
  WHERE name = '評価・成長'
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE WARNING '[task_health] サイドメニュー大分類「評価・成長」を解決できませんでした。'
      'service_class_index への登録をスキップします（手動登録してください）。';
  END IF;

  -- ---- カテゴリを新設する ----
  INSERT INTO public.service_category (id, sort_order, name, description, release_status)
  VALUES (
    v_category_id,
    (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM public.service_category),
    'タスク健康度',
    '組織横断でタスクの進捗・滞留・負荷偏在を可視化する',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- サイドメニュー大分類に紐付ける ----
  IF v_class_id IS NOT NULL THEN
    INSERT INTO public.service_class_index (service_class_id, service_category_id)
    SELECT v_class_id, v_category_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_class_index
      WHERE service_class_id = v_class_id AND service_category_id = v_category_id
    );
  END IF;

  -- ---- サービス本体を登録する ----
  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    'タスク健康度ダッシュボード',
    NULL,
    'タスク健康度ダッシュボード',
    '全社のタスク進捗概要・滞留タスク・担当者別負荷偏在・目標別達成状況を、部門で絞り込んで確認できます。',
    10,
    '/adm/task-health',
    NULL,
    NULL,
    'adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- 既存全テナントに機能を有効化する ----
  -- start_date/status は実データを調査した結果、既存269行すべてNULLで
  -- コード側でも参照されていない未使用カラムだった（tenant_serviceに行が
  -- 存在すること自体が「有効」を意味する）。実データパターンに合わせてNULLのまま入れる。
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_service_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_service_id
  );
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  RAISE NOTICE '[task_health] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
END $$;
```

上記の`start_date`/`status`をNULLのままにする判断は、計画作成時点でローカルDBの実データ（`SELECT status, status IS NULL, count(*) FROM tenant_service GROUP BY status` → 269行すべてNULL）とコード内の参照有無（`grep -rn "tenant_service" src --include="*.ts*" | grep -i status` → 0件）を確認済み。Step 4で実行する前に、実装時点のDBでも同じ状態か再確認すること：

Run: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "SELECT status, status IS NULL, count(*) FROM tenant_service GROUP BY status;"`

- [ ] **Step 4: ローカルに適用する**

Run: `supabase migration up`
Expected: エラーなく適用され、`NOTICE`でテナント件数が表示される

- [ ] **Step 5: 適用結果を確認する**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "
SELECT sc.name, s.title, s.route_path FROM service s
JOIN service_category sc ON sc.id = s.service_category_id
WHERE s.route_path = '/adm/task-health';"
```

Expected: 1行返る

- [ ] **Step 6: コミット**

```bash
git add supabase/migrations/
git commit -m "feat: タスク健康度ダッシュボードのメニュー登録マイグレーションを追加"
```

---

### Task 12: 統合確認・レビュー

**Files:** なし（新規作成・変更なし。既存ファイルの動作確認のみ）

- [ ] **Step 1: 全体テストを実行する**

Run: `npm run test`
Expected: 既存の無関係な1件（`data-migration/parse.test.ts`の年号ハードコード）を除き全件PASS

- [ ] **Step 2: 型チェック・lintを実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし（プロジェクト全体の既存警告件数から増えていないことを確認）

- [ ] **Step 3: devサーバーを起動し、実ブラウザまたはcurlで疎通確認する**

Run: `npm run dev`（起動済みなら不要）

テナント管理者アカウント（`sample@example.test` 等、CLAUDE.md参照）でログインし、`/adm/task-health` にアクセスして以下を確認する：

- 4カードすべてが表示される
- 部門フィルタを切り替えるとURLの`?division=`が変わり、表示内容が更新される
- 一般従業員（`app_role = 'employee'`）でアクセスするとリダイレクトされる

システムChromeが利用できずライブブラウザE2Eができない場合は、`curl -b <session-cookie>`等での疎通確認、またはSupabase実DBに対するNode REPLでの手動クエリ実行で代替し、その旨をレビュー時に明記する。

- [ ] **Step 4: `/code-review`スキルでレビューする**

CRITICAL/HIGHが無いことを確認する。MEDIUM/LOW指摘があれば都度ユーザーに確認して対応要否を判断する。

- [ ] **Step 5: PRDの実装ステータス表を更新する**

`docs/implementation-plan-task-management.md` セクション21.7の表（Task 1〜7、旧採番）を、実際に実行したTask 1〜12の内容に合わせて「完了」に更新する。

- [ ] **Step 6: push・PR作成**

```bash
git push -u origin feature/task-health-dashboard
gh pr create --title "feat: テナント管理者向けタスク健康度ダッシュボードを追加" --body "$(cat <<'EOF'
## Summary
- /adm/task-health に、全社のタスク進捗概要・滞留タスク・担当者別負荷偏在・目標別達成状況を可視化する管理者向けダッシュボードを追加
- 詳細設計は docs/implementation-plan-task-management.md セクション21参照

## Test plan
- [x] npm run test
- [x] npm run type-check
- [x] npm run lint
- [ ] ライブブラウザでのアクセス確認（環境制約により未実施の場合はその旨記載）
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** PRDセクション21.1（4指標）→Task 1/4/5-8、21.2（権限）→Task 2/10、21.3（データレイヤー）→Task 1/4、21.4（画面構成）→Task 5-10、21.5（マスタ登録）→Task 11、21.6（テスト方針）→Task 1/4/12。すべて対応済み。
- **app_role_service方針の修正:** PRDセクション21.5は「app_role_serviceでテナント管理者相当のロールに割当」としていたが、Task 11の設計中に既存grant_notifierマイグレーションの知見（未登録＝制限なし＝テナント管理者全役割に表示）を発見したため、Task 11では**登録しない**方針に変更した。Task 12完了後、PRDセクション21.5もこの知見に合わせて修正すること。
- **型の一貫性:** `StatusCounts`/`StalledReason`/`WorkloadAggregate`は`task-health.ts`（Task 1）で定義し、`queries.ts`（Task 4）がimportして使う。UIコンポーネント（Task 5-8）は`queries.ts`が定義した`TaskHealthOverview`/`StalledTaskRow`/`WorkloadRow`/`ObjectiveAchievementRow`のみを受け取り、`task-health.ts`の型を直接importするのは`StalledReason`（Task 6のバッジ表示用）のみ。
- **既存関数の再利用:** `calculateAverageProgress`/`groupProgressByParent`（`./progress`）、`fetchAllRows`（`queries.ts`内プライベート）を新規実装せず再利用する設計にした（DRY、PostgREST 1000行上限対応）。
