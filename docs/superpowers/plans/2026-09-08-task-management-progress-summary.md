# タスク管理 進捗サマリ機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク管理機能（Phase 3）の最初のサブ機能として、目標一覧・目標詳細・マイルストーン一覧に進捗サマリ（進捗リング／バー）を追加する。

**Architecture:** 既存の `task-management` フィーチャーへの追加。新規テーブル・マイグレーションは無く、既存の `tasks.progress_percent` を集計するだけの読み取り専用機能。新規UIコンポーネント2つ（`ProgressRing`/`ProgressBar`）と、`queries.ts` への集計関数追加、3つの既存画面（目標一覧・目標詳細・マイルストーン一覧）への組み込みのみで完結する。

**Tech Stack:** Next.js 16 App Router、TypeScript（strict: false）、Supabase（PostgreSQL + RLS）。Rechartsは使わず、進捗リング・バーはSVG/CSSで自作する（円形表示単体にはRechartsは過剰であり、既存のRecharts利用箇所はいずれもバーチャート用途のため）。

**Spec:** `docs/implementation-plan-task-management.md` セクション3（要求11）、セクション8（可視化ビュー）、セクション15（Phase 3 詳細設計：進捗サマリ）

## Global Constraints

- 新規テーブル・マイグレーションは無い。既存の `tasks.progress_percent` の集計のみで完結させる
- 集計は「全タスクの単純平均」（`calculateAverageProgress`、`src/features/task-management/progress.ts` の既存実装をそのまま再利用）。マイルストーン間・タスクグループ間でタスク数に偏りがあっても、階層ごとの平均のさらに平均（重み付け平均）は行わない
- N+1回避：目標一覧ページで目標ごとに個別クエリを発行しない。既存の `getObjectiveDetail` の「複数テーブルを段階的に一括取得してJSで組み立てる」パターンを踏襲する
- 大量データでのURL長スケーラビリティ：タスクIDやタスクグループIDの配列を `.in()` に渡す際、配列サイズがタスク件数に比例して肥大化する設計を避ける。`src/features/task-management/queries.ts` の `getWorkLogSummaryByObjective`（`task:task_id!inner(task_group_id)` の埋め込みフィルタ）と同じ手法を使い、配列サイズをマイルストーン件数程度に抑える
- Server Component（`page.tsx`）の初期表示データ取得は `queries.ts` に置く。この機能はモーダルや動的フェッチを伴わないため、Server Action の新設は不要
- コードコメントは日本語で記述する。ブランドカラーは `#FD7601`（HR-DX Design System）
- この機能はUIコンポーネント（`ProgressRing`/`ProgressBar`）にもDB問い合わせ関数（`queries.ts`）にも単体テストを追加しない。理由：(1) 前者は既存の `CommentThread`/`WorkLogSection` 等と同じく、このコードベースにはコンポーネント単体テストの仕組み（`*.test.tsx`）が存在しない、(2) 後者はライブSupabaseへの接続を要し、既存の `getObjectiveDetail`/`getWorkLogSummaryByGroup` 等の類似関数も同様に単体テストを持たず、型チェックとタスクレビュー・ライブ検証で担保する既存の規約に倣う
- 新設する埋め込みフィルタクエリ（Task 2）は、型チェックだけでは PostgREST の構文誤りを検出できない（前回の工数管理機能の最終レビューで実際に問題になった観点）。Task 2 には必ずローカルSupabaseに対するライブ検証ステップを含める

---

### Task 1: `ProgressRing`・`ProgressBar` コンポーネント

**Files:**

- Create: `src/features/task-management/components/ProgressRing.tsx`
- Create: `src/features/task-management/components/ProgressBar.tsx`

**Interfaces:**

- Consumes: なし（純粋なUIコンポーネント、propsのみ）
- Produces: `ProgressRing({ progress: number; size?: number })`、`ProgressBar({ progress: number })`。Task 3・4 がこれらをそのままimportして使う

- [ ] **Step 1: `ProgressRing` を作成する**

`src/features/task-management/components/ProgressRing.tsx` を作成する。

```tsx
interface ProgressRingProps {
  /** 進捗率（0-100）。範囲外の値は0-100にクランプして表示する */
  progress: number
  /** リングの直径（px）。デフォルトは目標カード・目標詳細ヘッダーで使う想定の56px */
  size?: number
}

/** 円形の進捗リング。SVGの二重円で表現し、中央に進捗率(%)を表示する */
export function ProgressRing({ progress, size = 56 }: ProgressRingProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))
  const offset = circumference * (1 - clamped / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e6ec"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FD7601"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-900 text-[11px] font-semibold"
      >
        {clamped}%
      </text>
    </svg>
  )
}
```

- [ ] **Step 2: `ProgressBar` を作成する**

`src/features/task-management/components/ProgressBar.tsx` を作成する。

```tsx
interface ProgressBarProps {
  /** 進捗率（0-100）。範囲外の値は0-100にクランプして表示する */
  progress: number
}

/** 横長の進捗バー。マイルストーン一覧など、複数行を縦に並べる箇所で使う */
export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-200">
        <div className="h-1.5 rounded-full bg-[#FD7601]" style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] text-slate-500">{clamped}%</span>
    </div>
  )
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし（このタスクの2ファイルはどこからもまだ import されていないため、新規エラーは発生しない）

- [ ] **Step 4: Lint**

Run: `npx eslint src/features/task-management/components/ProgressRing.tsx src/features/task-management/components/ProgressBar.tsx`
Expected: No issues found

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/components/ProgressRing.tsx src/features/task-management/components/ProgressBar.tsx
git commit -m "feat: 進捗サマリ用のProgressRing/ProgressBarコンポーネントを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `queries.ts` への進捗集計の追加

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: 既存の `calculateAverageProgress`（`progress.ts`）、既存の `getMyObjectives`・`mapObjective`・`ObjectiveDetail` の既存実装
- Produces: `ObjectiveDetail` インターフェースに `milestoneProgressById: Record<string, number>` と `objectiveProgress: number` を追加する。新規 `getMyObjectivesWithProgress(supabase): Promise<ObjectiveWithProgress[]>` と `ObjectiveWithProgress` 型。Task 3・4 はこれらをそのまま使う

- [ ] **Step 1: `getObjectiveDetail` の戻り値に進捗率を追加する**

`src/features/task-management/queries.ts` の `ObjectiveDetail` インターフェースを以下に置き換える。

```typescript
export interface ObjectiveDetail {
  objective: TaskObjective
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  /** マイルストーンID → そのマイルストーン配下全タスクのprogress_percentの単純平均（0-100） */
  milestoneProgressById: Record<string, number>
  /** 目標配下全タスクのprogress_percentの単純平均（0-100） */
  objectiveProgress: number
}
```

`getObjectiveDetail` 関数本体の末尾（既存の `return { objective: mapObjective(objectiveRow), milestones, taskGroupsByMilestoneId }` の直前）を、以下に置き換える。

```typescript
// マイルストーン別・目標全体の進捗率を計算する（要求11）。
// 全タスクの progress_percent をフラットに平均する（階層ごとの平均のさらに平均は取らない）。
const groupIdToMilestoneId = new Map<string, string>()
for (const [milestoneId, groups] of Object.entries(taskGroupsByMilestoneId)) {
  for (const group of groups) {
    groupIdToMilestoneId.set(group.id, milestoneId)
  }
}

const allGroupIds = Array.from(groupIdToMilestoneId.keys())
const milestoneProgressById: Record<string, number> = {}
let objectiveProgress = 0

if (allGroupIds.length > 0) {
  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('progress_percent, task_group_id')
    .in('task_group_id', allGroupIds)

  if (taskError) throw taskError

  const progressByMilestoneId: Record<string, number[]> = {}
  const allProgress: number[] = []

  for (const row of taskRows ?? []) {
    const milestoneId = groupIdToMilestoneId.get(row.task_group_id)
    if (!milestoneId) continue
    progressByMilestoneId[milestoneId] ??= []
    progressByMilestoneId[milestoneId].push(row.progress_percent)
    allProgress.push(row.progress_percent)
  }

  for (const milestoneId of milestoneIds) {
    milestoneProgressById[milestoneId] = calculateAverageProgress(
      progressByMilestoneId[milestoneId] ?? []
    )
  }

  objectiveProgress = calculateAverageProgress(allProgress)
} else {
  for (const milestoneId of milestoneIds) {
    milestoneProgressById[milestoneId] = 0
  }
}

return {
  objective: mapObjective(objectiveRow),
  milestones,
  taskGroupsByMilestoneId,
  milestoneProgressById,
  objectiveProgress,
}
```

（`milestoneIds` は同関数内で既に定義済みの変数をそのまま使う。新たに定義し直さない）

- [ ] **Step 2: `getMyObjectivesWithProgress` を追加する**

`src/features/task-management/queries.ts` のファイル末尾に以下を追加する。

```typescript
export interface ObjectiveWithProgress {
  objective: TaskObjective
  progress: number
}

/** `task_group:task_group_id!inner(milestone_id)` 埋め込みフィルタで返る行の型 */
interface TaskWithMilestoneRow {
  progress_percent: number
  task_group: { milestone_id: string }
}

/**
 * 自分が閲覧可能な目標一覧を、それぞれの進捗率（配下全タスクのprogress_percentの単純平均）付きで取得する（要求11）。
 *
 * 目標ごとに個別クエリを発行するとN+1になるため、可視な全目標→全マイルストーン→
 * （埋め込みフィルタで）全タスクの3クエリに抑える。タスクグループIDの配列を経由せず
 * `task_group:task_group_id!inner(milestone_id)` + `.in('task_group.milestone_id', milestoneIds)`
 * で直接タスクグループを介したフィルタを掛けることで、`.in()` に渡す配列サイズを
 * 目標配下のタスクグループ総数ではなくマイルストーン総数に抑える
 * （`getWorkLogSummaryByObjective` と同じ設計意図。詳細はそちらのコメント参照）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getMyObjectivesWithProgress(
  supabase: SupabaseClient<Database>
): Promise<ObjectiveWithProgress[]> {
  const objectives = await getMyObjectives(supabase)
  if (objectives.length === 0) return []

  const objectiveIds = objectives.map(o => o.id)

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id, objective_id')
    .in('objective_id', objectiveIds)

  if (milestoneError) throw milestoneError

  const objectiveIdByMilestoneId = new Map((milestoneRows ?? []).map(m => [m.id, m.objective_id]))
  const milestoneIds = Array.from(objectiveIdByMilestoneId.keys())

  const progressByObjectiveId = new Map<string, number[]>()

  if (milestoneIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('progress_percent, task_group:task_group_id!inner(milestone_id)')
      .in('task_group.milestone_id', milestoneIds)

    if (taskError) throw taskError

    for (const row of (taskRows ?? []) as unknown as TaskWithMilestoneRow[]) {
      const objectiveId = objectiveIdByMilestoneId.get(row.task_group.milestone_id)
      if (!objectiveId) continue
      const list = progressByObjectiveId.get(objectiveId) ?? []
      list.push(row.progress_percent)
      progressByObjectiveId.set(objectiveId, list)
    }
  }

  return objectives.map(objective => ({
    objective,
    progress: calculateAverageProgress(progressByObjectiveId.get(objective.id) ?? []),
  }))
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: `objectives/[id]/page.tsx` は次のタスクで更新するため、この時点ではまだ `ObjectiveDetail` の新規フィールドを使っていないことによる型エラーは出ない（フィールド追加は既存フィールドを壊さない後方互換な変更のため）。それ以外のエラーが出た場合は原因を確認する

- [ ] **Step 4: ローカルSupabaseに対するライブ検証**

対象DBの宣言: これはローカル（`127.0.0.1:55422` / `http://127.0.0.1:55421`）に対する操作である。

`getMyObjectivesWithProgress` の `task_group:task_group_id!inner(milestone_id)` 埋め込みフィルタは、型チェックだけでは実際にPostgRESTが受理する構文かどうかを検証できない（工数管理機能の最終レビューで実際に問題になった観点）。以下のいずれかの方法で、読み取り専用のライブ検証を行う。

Run（psqlで実在するテナント・目標のIDを確認する。実際の値は環境に合わせて置き換える）:

```bash
psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT id, objective_id FROM task_milestones LIMIT 3;"
```

次に、一時的な検証スクリプト（例: `scripts/verify-progress-summary-tmp.ts`、既存の `scripts/recalculate_stress_results.ts` 等の書き方に倣う）を作成し、`getObjectiveDetail`・`getMyObjectivesWithProgress` を実際にサービスロールクライアントで呼び出して、例外を投げずに完了することと、返ってきた `milestoneProgressById`/`objectiveProgress`/`progress` の値が0-100の範囲に収まっていることを確認する。

Run: `./node_modules/.bin/tsx scripts/verify-progress-summary-tmp.ts`
Expected: 例外なく完了し、進捗率が妥当な範囲の値で出力される

検証が終わったら、この一時スクリプトファイルは削除する（`git status --short` でリポジトリに残っていないことを確認する）。

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/queries.ts
git commit -m "feat: 目標・マイルストーン単位の進捗率集計をqueries.tsに追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: 目標一覧ページへの組み込み

**Files:**

- Modify: `src/features/task-management/components/ObjectiveCard.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/page.tsx`

**Interfaces:**

- Consumes: Task 1 の `ProgressRing`、Task 2 の `getMyObjectivesWithProgress`・`ObjectiveWithProgress`
- Produces: `ObjectiveCard` の新しい必須prop `progress: number`

- [ ] **Step 1: `ObjectiveCard` に進捗リングを追加する**

`src/features/task-management/components/ObjectiveCard.tsx` を以下に置き換える。

```tsx
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'
import { ProgressRing } from './ProgressRing'

interface ObjectiveCardProps {
  objective: TaskObjective
  /** この目標配下全タスクの進捗率（0-100） */
  progress: number
}

export function ObjectiveCard({ objective, progress }: ObjectiveCardProps) {
  return (
    <Link
      href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
      className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 shadow-xs p-5 hover:bg-[#f6f8fa]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{objective.title}</h3>
        {objective.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{objective.description}</p>
        )}
        {objective.dueDate && (
          <p className="mt-2 text-xs text-slate-400">期限: {objective.dueDate}</p>
        )}
      </div>
      <ProgressRing progress={progress} />
    </Link>
  )
}
```

- [ ] **Step 2: 目標一覧ページを `getMyObjectivesWithProgress` に切り替える**

`src/app/(tenant)/(tenant-users)/tasks/page.tsx` を以下に置き換える。

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyObjectivesWithProgress } from '@/features/task-management/queries'
import { ObjectiveCard } from '@/features/task-management/components/ObjectiveCard'
import { APP_ROUTES } from '@/config/routes'

export default async function TasksPage() {
  const supabase = await createClient()
  const objectivesWithProgress = await getMyObjectivesWithProgress(supabase)

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">タスク管理</h1>
        <Link
          href={APP_ROUTES.tasks.objectiveNew}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          新しい目標を作成
        </Link>
      </div>
      {objectivesWithProgress.length === 0 ? (
        <p className="text-xs text-slate-500">関与している目標がまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objectivesWithProgress.map(({ objective, progress }) => (
            <ObjectiveCard key={objective.id} objective={objective} progress={progress} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/components/ObjectiveCard.tsx "src/app/(tenant)/(tenant-users)/tasks/page.tsx"
git commit -m "feat: 目標一覧ページに進捗リングを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 目標詳細ページ・マイルストーン一覧への組み込み

**Files:**

- Modify: `src/features/task-management/components/MilestoneList.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 1 の `ProgressRing`・`ProgressBar`、Task 2 で拡張済みの `getObjectiveDetail`（`milestoneProgressById`・`objectiveProgress`）
- Produces: `MilestoneList` の新しい必須prop `milestoneProgressById: Record<string, number>`

- [ ] **Step 1: `MilestoneList` にマイルストーン別進捗バーを追加する**

`src/features/task-management/components/MilestoneList.tsx` を以下に置き換える。

```tsx
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { TaskGroupForm } from './TaskGroupForm'
import { ProgressBar } from './ProgressBar'
import type { TaskMilestone, TaskGroup } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  /** マイルストーンID → そのマイルストーン配下全タスクの進捗率（0-100） */
  milestoneProgressById: Record<string, number>
  canCreateTaskGroup: boolean
}

export function MilestoneList({
  milestones,
  taskGroupsByMilestoneId,
  milestoneProgressById,
  canCreateTaskGroup,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-slate-500">マイルストーンがまだありません。</p>
  }

  return (
    <ul className="space-y-3">
      {milestones.map(milestone => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">{milestone.title}</p>
          {milestone.dueDate && <p className="text-xs text-slate-400">期限: {milestone.dueDate}</p>}
          <div className="mt-2">
            <ProgressBar progress={milestoneProgressById[milestone.id] ?? 0} />
          </div>
          <ul className="mt-2 space-y-1">
            {(taskGroupsByMilestoneId[milestone.id] ?? []).map(group => (
              <li key={group.id}>
                <Link
                  href={APP_ROUTES.tasks.groupDetail(group.id)}
                  className="text-xs text-[#FD7601] underline"
                >
                  {group.name}
                </Link>
              </li>
            ))}
          </ul>
          {canCreateTaskGroup && <TaskGroupForm milestoneId={milestone.id} />}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: 目標詳細ページのヘッダーに進捗リングを追加する**

`src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx` を以下に置き換える。

```tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getObjectiveDetail,
  getWorkLogSummaryByObjective,
} from '@/features/task-management/queries'
import { MilestoneList } from '@/features/task-management/components/MilestoneList'
import { MilestoneForm } from '@/features/task-management/components/MilestoneForm'
import { WorkDistributionChart } from '@/features/task-management/components/WorkDistributionChart'
import { ProgressRing } from '@/features/task-management/components/ProgressRing'
import { isObjectiveOwner } from '@/features/task-management/permissions'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const {
    objective,
    milestones,
    taskGroupsByMilestoneId,
    milestoneProgressById,
    objectiveProgress,
  } = await getObjectiveDetail(supabase, id)
  const workLogSummary = await getWorkLogSummaryByObjective(supabase, id)
  // 表示制御のみの判定（UIの出し分け）。実際のアクセス制御は task_milestones の RLS INSERT ポリシーが担う。
  // user が null、または employee_id が未設定（従業員レコード無しユーザー）の場合は責任者ではない扱いにする。
  const isOwner = user?.employee_id
    ? isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
    : false

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-slate-900">{objective.title}</h1>
          {objective.description && (
            <p className="mt-1 text-xs text-slate-500">{objective.description}</p>
          )}
        </div>
        <ProgressRing progress={objectiveProgress} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">マイルストーン</h2>
        <MilestoneList
          milestones={milestones}
          taskGroupsByMilestoneId={taskGroupsByMilestoneId}
          milestoneProgressById={milestoneProgressById}
          canCreateTaskGroup={isOwner}
        />
        {isOwner && <MilestoneForm objectiveId={objective.id} />}
      </section>

      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="text-xs font-semibold text-slate-900 mb-2">タスクグループ別工数分布</h2>
        <WorkDistributionChart
          data={workLogSummary.map(s => ({
            id: s.taskGroupId,
            label: s.taskGroupName,
            hours: s.totalHours,
          }))}
          emptyMessage="工数記録はまだありません。"
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし（`MilestoneList` の新しい必須propは、このステップで呼び出し元も同時に更新済みのため型エラーは残らない）

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/components/MilestoneList.tsx "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"
git commit -m "feat: 目標詳細ページ・マイルストーン一覧に進捗表示を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: 全体テスト実行・手動E2E確認・PRDステータス更新

**Files:**

- Modify: `docs/implementation-plan-task-management.md`

**Interfaces:**

- Consumes: Task 1〜4 で実装した全機能
- Produces: なし（検証・ドキュメント更新タスク）

- [ ] **Step 1: 単体テストを全件実行する**

Run: `npm test`
Expected: 全件PASS（このプランはテストを追加しないため件数は変わらない）。唯一の既知の無関係な既存失敗（`src/features/data-migration/parse.test.ts`、年度ハードコード）以外に失敗が無いことを確認する

- [ ] **Step 2: 型チェック・Lint**

Run: `npm run type-check && npm run lint`
Expected: エラーなし（変更したファイルについて。リポジトリ全体の既存lint debtは対象外）

- [ ] **Step 3: 開発サーバーで手動E2E確認する**

対象DBの宣言: これはローカル（`127.0.0.1:55422` / `http://127.0.0.1:55421`）に対する操作である。

Run: `npm run dev`（既に起動している場合は流用する）

以下をブラウザで確認する。

1. `/tasks` を開き、各目標カードに進捗リング（円形、パーセント表示）が表示されることを確認する
2. 目標詳細ページ（`/tasks/objectives/[id]`）を開き、ヘッダーに目標全体の進捗リングが表示されること、各マイルストーン行に進捗バーが表示されることを確認する
3. タスクが1件も無い目標・マイルストーンでは進捗が0%と表示されることを確認する
4. タスクグループ詳細ページでタスクの進捗率を変更した後、目標一覧・目標詳細ページをリロードして、進捗リング・バーの数値が更新されることを確認する

ローカルDBにテスト可能なタスクデータが無い場合は、工数管理機能のPRD注記（セクション14.5）と同様に、実施できなかった旨と代替の検証根拠（型チェック・タスクレビュー・Task 2でのライブクエリ検証）を正直に記録する。

- [ ] **Step 4: PRDのステータスを更新する**

`docs/implementation-plan-task-management.md` のセクション15.5「実装ステータス（サブタスク単位）」の全行を「完了」に更新する（手動E2Eが実施できなかった場合は、工数管理機能の注記と同じスタイルで正直に注記を添える）。セクション12「実装ステータス」のPhase 3行を以下に更新する。

```markdown
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 一部完了（進捗サマリ完了／残り3項目は未着手） |
```

- [ ] **Step 5: Commit**

```bash
git add docs/implementation-plan-task-management.md
git commit -m "docs: 進捗サマリ機能のPRDステータスを更新

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
