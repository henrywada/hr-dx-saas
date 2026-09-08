# タスク管理 組織ツリー可視化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク管理機能（Phase 3）の3番目のサブ機能として、目標詳細ページに「責任者 → タスクグループ → {マネージャー・メンバー}」の組織ツリーを可視化するセクションを追加する。各ノードに担当タスク数・平均進捗率をバッジ表示する。

**Architecture:** DBクエリ結果（`queries.ts`）→ ツリー構築・レイアウト計算（`org-tree.ts`、DBに依存しない純粋関数）→ `@xyflow/react`（新規導入）による読み取り専用ビューアー描画、という3層構成。レイアウト計算は`dagre`等の汎用ライブラリを使わず、木構造専用の自前アルゴリズム（深さ優先探索）で実装する。`@xyflow/react`は`next/dynamic`（`ssr: false`）でクライアント側のみ・必要時のみ読み込む。

**Tech Stack:** Next.js 16 App Router、TypeScript（strict: false）、React 19、Supabase（PostgreSQL + RLS）、`@xyflow/react`（新規、v12、MIT、React 19動作確認済み）。

**Spec:** `docs/implementation-plan-task-management.md` セクション3（要求10）、セクション8、セクション17（Phase 3 詳細設計：組織ツリー可視化）

## Global Constraints

- 新規テーブル・マイグレーションは追加しない（既存の`task_objectives`/`task_milestones`/`task_groups`/`task_group_managers`/`task_group_members`/`tasks`を読み取るのみ）
- 可視範囲の絞り込みは新たに実装せず、既存RLSポリシー（`task_objectives_select`・`task_group_managers_select`・`task_group_members_select`等）にそのまま委ねる。追加のテナント・権限フィルタは行わない
- マネージャーとメンバーはタスクグループの子として**並列**に配置する（マネージャー→メンバーの親子関係は作らない。`task_group_managers`/`task_group_members`はどちらもタスクグループに独立に紐づく中間テーブルであり、特定のマネージャーと特定のメンバーの1対多関係はデータモデル上存在しないため）
- 同一従業員が複数のタスクグループに所属する場合は、DAGではなくタスクグループごとに別ノード（別ID）として重複表示する単純な木構造とする
- `org-tree.ts`はDBクエリを含まない純粋関数のみとし、`node:test`でユニットテストする（既存の`progress.ts`・`feed-provider.ts`と同じ規約）。UIコンポーネント（`OrgTreeNodeCard.tsx`・`OrgTreeCanvas.tsx`・`OrgTreeSection.tsx`）は、既存の`WorkDistributionChart.tsx`等と同様にユニットテスト対象外とする
- コードコメントは日本語で記述する
- 新規依存は`@xyflow/react`のみ。レイアウト計算用の追加ライブラリ（`dagre`等）は導入しない

---

### Task 1: `org-tree.ts`（ツリー構築・レイアウト純粋関数）

**Files:**

- Create: `src/features/task-management/org-tree.ts`
- Create: `src/features/task-management/org-tree.test.ts`

**Interfaces:**

- Consumes: `calculateAverageProgress`・`groupProgressByParent`（`src/features/task-management/progress.ts`、既存）
- Produces: `buildOrgTreeGraph(input: BuildOrgTreeInput): { nodes: OrgTreeNodeData[]; edges: OrgTreeEdge[] }`、`layoutOrgTree(nodes: OrgTreeNodeData[], edges: OrgTreeEdge[], rootId: string): PositionedOrgTreeNode[]`、定数`ORG_TREE_ROOT_ID`、型`OrgTreeNodeRole`・`OrgTreeNodeData`・`OrgTreeEdge`・`OrgTreeEmployeeRef`・`OrgTreeGroupInput`・`OrgTreeTaskRow`・`BuildOrgTreeInput`・`PositionedOrgTreeNode`・`OrgTree`（Task 2の`queries.ts`、Task 3のコンポーネント群がこれらをimportする）

- [ ] **Step 1: 失敗するテストを書く（buildOrgTreeGraph）**

`src/features/task-management/org-tree.test.ts`を新規作成する。

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOrgTreeGraph,
  layoutOrgTree,
  type OrgTreeNodeData,
  type OrgTreeEdge,
} from './org-tree'

test('buildOrgTreeGraph: タスクグループが無ければ責任者ノードのみを返す', () => {
  const { nodes, edges } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [],
    tasks: [],
  })
  assert.deepEqual(nodes, [
    { id: 'owner', label: '田中', role: 'owner', taskCount: 0, progressPercent: 0 },
  ])
  assert.deepEqual(edges, [])
})

test('buildOrgTreeGraph: 1グループ・1マネージャー・1メンバーでノード4件・エッジ3件を生成する', () => {
  const { nodes, edges } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: '設計チーム',
        managers: [{ employeeId: 'm1', employeeName: '佐藤' }],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [],
  })

  assert.equal(nodes.length, 4)
  assert.equal(edges.length, 3)
  assert.deepEqual(
    edges.map(e => [e.source, e.target]),
    [
      ['owner', 'group:g1'],
      ['group:g1', 'manager:g1:m1'],
      ['group:g1', 'member:g1:e1'],
    ]
  )
})

test('buildOrgTreeGraph: タスクグループ・メンバーごとにタスク数と平均進捗率を集計する', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: '設計チーム',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeId: 'e1', progressPercent: 20 },
      { taskGroupId: 'g1', assigneeEmployeeId: 'e1', progressPercent: 60 },
    ],
  })

  const ownerNode = nodes.find(n => n.id === 'owner')
  const groupNode = nodes.find(n => n.id === 'group:g1')
  const memberNode = nodes.find(n => n.id === 'member:g1:e1')

  assert.deepEqual(ownerNode, {
    id: 'owner',
    label: '田中',
    role: 'owner',
    taskCount: 2,
    progressPercent: 40,
  })
  assert.equal(groupNode?.taskCount, 2)
  assert.equal(groupNode?.progressPercent, 40)
  assert.equal(memberNode?.taskCount, 2)
  assert.equal(memberNode?.progressPercent, 40)
})

test('buildOrgTreeGraph: 同一人物が複数グループに所属する場合、グループごとに別ノードとして独立集計する', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
      {
        taskGroupId: 'g2',
        taskGroupName: 'B',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeId: 'e1', progressPercent: 100 },
      { taskGroupId: 'g2', assigneeEmployeeId: 'e1', progressPercent: 0 },
    ],
  })

  const memberInG1 = nodes.find(n => n.id === 'member:g1:e1')
  const memberInG2 = nodes.find(n => n.id === 'member:g2:e1')

  assert.equal(memberInG1?.progressPercent, 100)
  assert.equal(memberInG2?.progressPercent, 0)
  assert.notEqual(memberInG1?.id, memberInG2?.id)
})

test('buildOrgTreeGraph: 未割当タスクはグループ集計に含むが人物集計には含めない', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeId: 'e1', progressPercent: 100 },
      { taskGroupId: 'g1', assigneeEmployeeId: null, progressPercent: 0 },
    ],
  })

  const groupNode = nodes.find(n => n.id === 'group:g1')
  const memberNode = nodes.find(n => n.id === 'member:g1:e1')

  assert.equal(groupNode?.taskCount, 2)
  assert.equal(groupNode?.progressPercent, 50)
  assert.equal(memberNode?.taskCount, 1)
  assert.equal(memberNode?.progressPercent, 100)
})

test('layoutOrgTree: ルートのみ（子なし）はx=0, y=0になる', () => {
  const positioned = layoutOrgTree(
    [{ id: 'owner', label: '田中', role: 'owner', taskCount: 0, progressPercent: 0 }],
    [],
    'owner'
  )
  assert.deepEqual(positioned, [
    { id: 'owner', label: '田中', role: 'owner', taskCount: 0, progressPercent: 0, x: 0, y: 0 },
  ])
})

test('layoutOrgTree: 葉ノードは左から順にX座標が割り振られ、非葉ノードは子の平均になる', () => {
  const nodes: OrgTreeNodeData[] = [
    { id: 'owner', label: 'owner', role: 'owner', taskCount: 0, progressPercent: 0 },
    { id: 'a', label: 'a', role: 'task_group', taskCount: 0, progressPercent: 0 },
    { id: 'b', label: 'b', role: 'manager', taskCount: 0, progressPercent: 0 },
    { id: 'c', label: 'c', role: 'member', taskCount: 0, progressPercent: 0 },
  ]
  const edges: OrgTreeEdge[] = [
    { id: 'e1', source: 'owner', target: 'a' },
    { id: 'e2', source: 'a', target: 'b' },
    { id: 'e3', source: 'a', target: 'c' },
  ]
  const positioned = layoutOrgTree(nodes, edges, 'owner')
  const byId = new Map(positioned.map(n => [n.id, n]))

  assert.equal(byId.get('b')?.x, 0)
  assert.equal(byId.get('c')?.x, 200)
  assert.equal(byId.get('a')?.x, 100)
  assert.equal(byId.get('owner')?.x, 100)
  assert.equal(byId.get('owner')?.y, 0)
  assert.equal(byId.get('a')?.y, 140)
  assert.equal(byId.get('b')?.y, 280)
})
```

- [ ] **Step 2: テストを実行し、失敗することを確認する**

Run: `node --import tsx --test src/features/task-management/org-tree.test.ts`
Expected: FAIL（`org-tree.ts`が存在しないためimportエラー）

- [ ] **Step 3: `org-tree.ts`を実装する**

`src/features/task-management/org-tree.ts`を新規作成する。

```typescript
import { calculateAverageProgress, groupProgressByParent } from './progress'

export type OrgTreeNodeRole = 'owner' | 'task_group' | 'manager' | 'member'

export interface OrgTreeNodeData {
  id: string
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
}

export interface OrgTreeEdge {
  id: string
  source: string
  target: string
}

export interface OrgTreeEmployeeRef {
  employeeId: string
  employeeName: string
}

export interface OrgTreeGroupInput {
  taskGroupId: string
  taskGroupName: string
  managers: OrgTreeEmployeeRef[]
  members: OrgTreeEmployeeRef[]
}

export interface OrgTreeTaskRow {
  taskGroupId: string
  assigneeEmployeeId: string | null
  progressPercent: number
}

export interface BuildOrgTreeInput {
  ownerEmployeeId: string
  ownerEmployeeName: string
  groups: OrgTreeGroupInput[]
  tasks: OrgTreeTaskRow[]
}

export interface PositionedOrgTreeNode extends OrgTreeNodeData {
  x: number
  y: number
}

export interface OrgTree {
  nodes: PositionedOrgTreeNode[]
  edges: OrgTreeEdge[]
}

/** ツリーのルート（責任者ノード）の固定ID */
export const ORG_TREE_ROOT_ID = 'owner'

function taskGroupNodeId(taskGroupId: string): string {
  return `group:${taskGroupId}`
}

function managerNodeId(taskGroupId: string, employeeId: string): string {
  return `manager:${taskGroupId}:${employeeId}`
}

function memberNodeId(taskGroupId: string, employeeId: string): string {
  return `member:${taskGroupId}:${employeeId}`
}

/**
 * 目標配下の組織ツリー（責任者 → タスクグループ → {マネージャー・メンバー}）のノード・エッジを構築する。
 * マネージャーとメンバーはどちらもタスクグループの直接の子として並列に配置する
 * （`task_group_managers`/`task_group_members` はどちらもタスクグループ単位の独立した中間テーブルであり、
 * 「特定のマネージャーが特定のメンバーを管理する」という関係はデータモデル上存在しないため）。
 * 同一人物が複数グループに所属する場合はグループごとに別ノードとして重複させ、
 * 進捗もグループごとに独立集計する。
 */
export function buildOrgTreeGraph(input: BuildOrgTreeInput): {
  nodes: OrgTreeNodeData[]
  edges: OrgTreeEdge[]
} {
  const nodes: OrgTreeNodeData[] = []
  const edges: OrgTreeEdge[] = []

  const allProgress = input.tasks.map(t => t.progressPercent)
  nodes.push({
    id: ORG_TREE_ROOT_ID,
    label: input.ownerEmployeeName,
    role: 'owner',
    taskCount: input.tasks.length,
    progressPercent: calculateAverageProgress(allProgress),
  })

  const groupIds = input.groups.map(g => g.taskGroupId)
  const groupProgressById = groupProgressByParent(
    input.tasks.map(t => ({ value: t.progressPercent, parentId: t.taskGroupId })),
    groupIds
  )

  const groupTaskCountById = new Map<string, number>()
  for (const task of input.tasks) {
    groupTaskCountById.set(task.taskGroupId, (groupTaskCountById.get(task.taskGroupId) ?? 0) + 1)
  }

  // マネージャー・メンバーは「そのタスクグループ内でその人に割り当てられたタスク」で集計するため、
  // parentId を `${taskGroupId}:${employeeId}` の複合キーにする（同一人物が複数グループに
  // 所属してもグループごとに独立集計されるようにするため）。
  const personKeys: string[] = []
  for (const group of input.groups) {
    for (const person of [...group.managers, ...group.members]) {
      personKeys.push(`${group.taskGroupId}:${person.employeeId}`)
    }
  }
  const personProgressByKey = groupProgressByParent(
    input.tasks
      .filter(t => t.assigneeEmployeeId !== null)
      .map(t => ({
        value: t.progressPercent,
        parentId: `${t.taskGroupId}:${t.assigneeEmployeeId}`,
      })),
    personKeys
  )

  const personTaskCountByKey = new Map<string, number>()
  for (const task of input.tasks) {
    if (!task.assigneeEmployeeId) continue
    const key = `${task.taskGroupId}:${task.assigneeEmployeeId}`
    personTaskCountByKey.set(key, (personTaskCountByKey.get(key) ?? 0) + 1)
  }

  for (const group of input.groups) {
    const groupNodeId = taskGroupNodeId(group.taskGroupId)
    nodes.push({
      id: groupNodeId,
      label: group.taskGroupName,
      role: 'task_group',
      taskCount: groupTaskCountById.get(group.taskGroupId) ?? 0,
      progressPercent: groupProgressById[group.taskGroupId] ?? 0,
    })
    edges.push({
      id: `${ORG_TREE_ROOT_ID}->${groupNodeId}`,
      source: ORG_TREE_ROOT_ID,
      target: groupNodeId,
    })

    for (const manager of group.managers) {
      const key = `${group.taskGroupId}:${manager.employeeId}`
      const nodeId = managerNodeId(group.taskGroupId, manager.employeeId)
      nodes.push({
        id: nodeId,
        label: manager.employeeName,
        role: 'manager',
        taskCount: personTaskCountByKey.get(key) ?? 0,
        progressPercent: personProgressByKey[key] ?? 0,
      })
      edges.push({ id: `${groupNodeId}->${nodeId}`, source: groupNodeId, target: nodeId })
    }

    for (const member of group.members) {
      const key = `${group.taskGroupId}:${member.employeeId}`
      const nodeId = memberNodeId(group.taskGroupId, member.employeeId)
      nodes.push({
        id: nodeId,
        label: member.employeeName,
        role: 'member',
        taskCount: personTaskCountByKey.get(key) ?? 0,
        progressPercent: personProgressByKey[key] ?? 0,
      })
      edges.push({ id: `${groupNodeId}->${nodeId}`, source: groupNodeId, target: nodeId })
    }
  }

  return { nodes, edges }
}

const LAYOUT_NODE_SPACING = 200
const LAYOUT_LEVEL_HEIGHT = 140

/**
 * ツリー構造（nodes/edges）から各ノードのx/y座標を計算する（`@xyflow/react`向け）。
 * 深さ優先探索で葉ノードに左から順に連番を振ってX座標を決め、非葉ノードのX座標は
 * 子ノードX座標の平均とする、木構造専用のシンプルなレイアウトアルゴリズム
 * （`dagre`等の汎用グラフレイアウトライブラリは導入しない）。
 * ノードのroleには依存せず、純粋にedgesが表すグラフ構造のみを見るため、
 * 子を持たないノード（例：メンバーがいないタスクグループ）も自然に葉として扱われる。
 */
export function layoutOrgTree(
  nodes: OrgTreeNodeData[],
  edges: OrgTreeEdge[],
  rootId: string
): PositionedOrgTreeNode[] {
  const childrenBySource = new Map<string, string[]>()
  for (const edge of edges) {
    const children = childrenBySource.get(edge.source) ?? []
    children.push(edge.target)
    childrenBySource.set(edge.source, children)
  }

  const depthById = new Map<string, number>()
  const xById = new Map<string, number>()
  let nextLeafIndex = 0

  function visit(nodeId: string, depth: number): number {
    depthById.set(nodeId, depth)
    const children = childrenBySource.get(nodeId) ?? []

    if (children.length === 0) {
      const x = nextLeafIndex * LAYOUT_NODE_SPACING
      nextLeafIndex += 1
      xById.set(nodeId, x)
      return x
    }

    const childXs = children.map(childId => visit(childId, depth + 1))
    const x = childXs.reduce((sum, value) => sum + value, 0) / childXs.length
    xById.set(nodeId, x)
    return x
  }

  visit(rootId, 0)

  return nodes.map(node => ({
    ...node,
    x: xById.get(node.id) ?? 0,
    y: (depthById.get(node.id) ?? 0) * LAYOUT_LEVEL_HEIGHT,
  }))
}
```

- [ ] **Step 4: テストを実行し、成功することを確認する**

Run: `node --import tsx --test src/features/task-management/org-tree.test.ts`
Expected: PASS（7件）

- [ ] **Step 5: 型チェック・ESLintを実行する**

Run: `npm run type-check && npx eslint src/features/task-management/org-tree.ts src/features/task-management/org-tree.test.ts`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/org-tree.ts src/features/task-management/org-tree.test.ts
git commit -m "feat: 組織ツリーのグラフ構築・レイアウト計算ロジックを追加"
```

---

### Task 2: `getObjectiveOrgTree`（`queries.ts`）

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: `buildOrgTreeGraph`・`layoutOrgTree`・`ORG_TREE_ROOT_ID`・型`OrgTreeGroupInput`・`OrgTreeEmployeeRef`・`OrgTreeTaskRow`・`OrgTree`（Task 1、`./org-tree`からimport）、既存の`fetchAllRows`（同ファイル内）
- Produces: `getObjectiveOrgTree(supabase: SupabaseClient<Database>, objectiveId: string): Promise<OrgTree>`（Task 3の`page.tsx`がこれをimportする）

- [ ] **Step 1: `queries.ts`の先頭にimportを追加する**

`src/features/task-management/queries.ts`の既存import群（ファイル冒頭、`work-log-summary`のimportの直後）に以下を追加する。

```typescript
import {
  buildOrgTreeGraph,
  layoutOrgTree,
  ORG_TREE_ROOT_ID,
  type OrgTreeGroupInput,
  type OrgTreeEmployeeRef,
  type OrgTreeTaskRow,
  type OrgTree,
} from './org-tree'
```

- [ ] **Step 2: `getObjectiveOrgTree`をファイル末尾に追加する**

`src/features/task-management/queries.ts`の末尾（`getMyObjectivesWithProgress`関数の後）に以下を追加する。

```typescript
interface OrgTreeGroupPersonRow {
  task_group_id: string
  employee_id: string
  employee: { name: string | null } | null
}

/**
 * 目標（task_objectives）配下の組織ツリー（責任者 → タスクグループ → {マネージャー・メンバー}）を、
 * 座標計算済みのノード・エッジとして取得する（要求10）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getObjectiveOrgTree(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<OrgTree> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('owner_employee_id')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)

  if (milestoneError) throw milestoneError

  const milestoneIds = (milestoneRows ?? []).map(m => m.id)

  let groupRows: { id: string; name: string }[] = []
  if (milestoneIds.length > 0) {
    const { data, error } = await supabase
      .from('task_groups')
      .select('id, name')
      .in('milestone_id', milestoneIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    groupRows = data ?? []
  }

  const groupIds = groupRows.map(g => g.id)

  let managerRows: OrgTreeGroupPersonRow[] = []
  let memberRows: OrgTreeGroupPersonRow[] = []
  let taskRows: {
    task_group_id: string
    assignee_employee_id: string | null
    progress_percent: number
  }[] = []

  if (groupIds.length > 0) {
    const [managerResult, memberResult] = await Promise.all([
      supabase
        .from('task_group_managers')
        .select('task_group_id, employee_id, employee:employee_id(name)')
        .in('task_group_id', groupIds),
      supabase
        .from('task_group_members')
        .select('task_group_id, employee_id, employee:employee_id(name)')
        .in('task_group_id', groupIds),
    ])

    if (managerResult.error) throw managerResult.error
    if (memberResult.error) throw memberResult.error
    managerRows = (managerResult.data ?? []) as unknown as OrgTreeGroupPersonRow[]
    memberRows = (memberResult.data ?? []) as unknown as OrgTreeGroupPersonRow[]

    taskRows = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('tasks')
        .select('task_group_id, assignee_employee_id, progress_percent')
        .in('task_group_id', groupIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    })
  }

  // マネージャー・メンバーは埋め込みで氏名を取得済みのため、責任者のみ別途取得する
  const { data: ownerRow, error: ownerError } = await supabase
    .from('employees')
    .select('name')
    .eq('id', objectiveRow.owner_employee_id)
    .single()

  if (ownerError) throw ownerError

  const managersByGroupId = new Map<string, OrgTreeEmployeeRef[]>()
  for (const row of managerRows) {
    const list = managersByGroupId.get(row.task_group_id) ?? []
    list.push({ employeeId: row.employee_id, employeeName: row.employee?.name ?? '（名前未設定）' })
    managersByGroupId.set(row.task_group_id, list)
  }

  const membersByGroupId = new Map<string, OrgTreeEmployeeRef[]>()
  for (const row of memberRows) {
    const list = membersByGroupId.get(row.task_group_id) ?? []
    list.push({ employeeId: row.employee_id, employeeName: row.employee?.name ?? '（名前未設定）' })
    membersByGroupId.set(row.task_group_id, list)
  }

  const sortByName = (a: OrgTreeEmployeeRef, b: OrgTreeEmployeeRef) =>
    a.employeeName.localeCompare(b.employeeName, 'ja')

  const groups: OrgTreeGroupInput[] = groupRows.map(g => ({
    taskGroupId: g.id,
    taskGroupName: g.name,
    managers: (managersByGroupId.get(g.id) ?? []).sort(sortByName),
    members: (membersByGroupId.get(g.id) ?? []).sort(sortByName),
  }))

  const tasks: OrgTreeTaskRow[] = taskRows.map(row => ({
    taskGroupId: row.task_group_id,
    assigneeEmployeeId: row.assignee_employee_id,
    progressPercent: row.progress_percent,
  }))

  const { nodes, edges } = buildOrgTreeGraph({
    ownerEmployeeId: objectiveRow.owner_employee_id,
    ownerEmployeeName: ownerRow.name ?? '（名前未設定）',
    groups,
    tasks,
  })

  return {
    nodes: layoutOrgTree(nodes, edges, ORG_TREE_ROOT_ID),
    edges,
  }
}
```

- [ ] **Step 3: 型チェック・ESLintを実行する**

Run: `npm run type-check && npx eslint src/features/task-management/queries.ts`
Expected: エラーなし

- [ ] **Step 4: 既存テストスイート全体を実行し、既存のテストを壊していないことを確認する**

Run: `npm test`
Expected: `src/features/data-migration/parse.test.ts`（既知の無関係な既存不具合、過去プランと同じ）以外は全てPASS

- [ ] **Step 5: コミット**

```bash
git add src/features/task-management/queries.ts
git commit -m "feat: 目標配下の組織ツリーを取得するgetObjectiveOrgTreeを追加"
```

---

### Task 3: `@xyflow/react`導入・UIコンポーネント・目標詳細ページへの組み込み

**Files:**

- Modify: `package.json`（`@xyflow/react`を新規依存として追加）
- Create: `src/features/task-management/components/OrgTreeNodeCard.tsx`
- Create: `src/features/task-management/components/OrgTreeCanvas.tsx`
- Create: `src/features/task-management/components/OrgTreeSection.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: `OrgTree`・`PositionedOrgTreeNode`・`OrgTreeEdge`・`OrgTreeNodeRole`（Task 1、`@/features/task-management/org-tree`）、`getObjectiveOrgTree`（Task 2、`@/features/task-management/queries`）、既存の`ProgressBar`・`Badge`コンポーネント
- Produces: `OrgTreeSection`コンポーネント（`page.tsx`が使用する）

- [ ] **Step 1: `@xyflow/react`をインストールする**

Run: `npm install @xyflow/react@^12.11.6`
Expected: `package.json`の`dependencies`に`"@xyflow/react": "^12.11.6"`が追加され、`package-lock.json`が更新される

- [ ] **Step 2: `OrgTreeNodeCard.tsx`を作成する**

`src/features/task-management/components/OrgTreeNodeCard.tsx`を新規作成する。

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ProgressBar } from './ProgressBar'
import { Badge } from '@/components/ui/Badge'
import type { OrgTreeNodeRole } from '../org-tree'

export interface OrgTreeNodeCardData {
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  [key: string]: unknown
}

const ROLE_LABEL: Record<OrgTreeNodeRole, string> = {
  owner: '責任者',
  task_group: 'タスクグループ',
  manager: 'マネージャー',
  member: 'メンバー',
}

const ROLE_BADGE_VARIANT: Record<OrgTreeNodeRole, 'primary' | 'teal' | 'orange' | 'neutral'> = {
  owner: 'orange',
  task_group: 'neutral',
  manager: 'teal',
  member: 'primary',
}

/** 組織ツリーの1ノード（責任者・タスクグループ・マネージャー・メンバー）を表すカード */
export function OrgTreeNodeCard({ data }: NodeProps) {
  const { label, role, taskCount, progressPercent } = data as unknown as OrgTreeNodeCardData

  return (
    <div className="w-44 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <Badge variant={ROLE_BADGE_VARIANT[role]} className="!px-2 !py-0.5 !text-[10px]">
        {ROLE_LABEL[role]}
      </Badge>
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-900" title={label}>
        {label}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">担当タスク {taskCount}件</p>
      <div className="mt-1">
        <ProgressBar progress={progressPercent} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  )
}
```

- [ ] **Step 3: `OrgTreeCanvas.tsx`を作成する**

`src/features/task-management/components/OrgTreeCanvas.tsx`を新規作成する。

```tsx
'use client'

import { useMemo } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { OrgTreeNodeCard } from './OrgTreeNodeCard'
import type { PositionedOrgTreeNode, OrgTreeEdge } from '../org-tree'

interface OrgTreeCanvasProps {
  nodes: PositionedOrgTreeNode[]
  edges: OrgTreeEdge[]
}

const nodeTypes = { orgTreeNode: OrgTreeNodeCard }

/**
 * 組織ツリーの読み取り専用ビューアー本体。
 * `@xyflow/react`を直接利用するため、`OrgTreeSection`から`next/dynamic`（`ssr: false`）で
 * このモジュール単位で動的import・遅延読み込みされる。
 */
export function OrgTreeCanvas({ nodes, edges }: OrgTreeCanvasProps) {
  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map(node => ({
        id: node.id,
        type: 'orgTreeNode',
        position: { x: node.x, y: node.y },
        data: {
          label: node.label,
          role: node.role,
          taskCount: node.taskCount,
          progressPercent: node.progressPercent,
        },
      })),
    [nodes]
  )

  const flowEdges = useMemo<Edge[]>(
    () => edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target })),
    [edges]
  )

  return (
    <div className="h-[420px] w-full rounded-lg border border-slate-200">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 4: `OrgTreeSection.tsx`を作成する**

`src/features/task-management/components/OrgTreeSection.tsx`を新規作成する。

```tsx
'use client'

import dynamic from 'next/dynamic'
import type { OrgTree } from '../org-tree'

interface OrgTreeSectionProps {
  data: OrgTree
}

const OrgTreeCanvas = dynamic(() => import('./OrgTreeCanvas').then(mod => mod.OrgTreeCanvas), {
  ssr: false,
  loading: () => <p className="text-xs text-slate-400">組織ツリーを読み込み中...</p>,
})

/**
 * 目標詳細ページの組織ツリーセクション。
 * `@xyflow/react`は本機能専用の重量級ライブラリのため、`next/dynamic`（`ssr: false`）で
 * このセクションが実際に描画される時のみクライアント側で読み込み、
 * 目標詳細ページの初期表示バンドルには含めない。
 */
export function OrgTreeSection({ data }: OrgTreeSectionProps) {
  if (data.nodes.length <= 1) {
    return <p className="text-xs text-slate-400">タスクグループがまだありません。</p>
  }

  return <OrgTreeCanvas nodes={data.nodes} edges={data.edges} />
}
```

- [ ] **Step 5: 目標詳細ページに組み込む**

`src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`を編集する。

まずimportに以下を追加する（既存の`getObjectiveDetail`・`getWorkLogSummaryByObjective`のimportに追加、`OrgTreeSection`のimportを新規追加）。

```typescript
import {
  getObjectiveDetail,
  getWorkLogSummaryByObjective,
  getObjectiveOrgTree,
} from '@/features/task-management/queries'
import { OrgTreeSection } from '@/features/task-management/components/OrgTreeSection'
```

次に、既存の`const workLogSummary = await getWorkLogSummaryByObjective(supabase, id)`の直後に以下を追加する。

```typescript
const orgTree = await getObjectiveOrgTree(supabase, id)
```

最後に、既存の工数分布グラフの`<section>`（`WorkDistributionChart`を含む）の直後、`</div>`（ルート要素の閉じタグ）の直前に以下を追加する。

```tsx
<section className="rounded-lg border border-slate-200 p-3">
  <h2 className="text-xs font-semibold text-slate-900 mb-2">組織ツリー</h2>
  <OrgTreeSection data={orgTree} />
</section>
```

- [ ] **Step 6: 型チェック・ESLintを実行する**

Run: `npm run type-check && npx eslint src/features/task-management/components/OrgTreeNodeCard.tsx src/features/task-management/components/OrgTreeCanvas.tsx src/features/task-management/components/OrgTreeSection.tsx "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"`
Expected: エラーなし

- [ ] **Step 7: 開発サーバーを起動し、目標詳細ページが正常にレンダリングされることを確認する**

Run: `npm run dev`をバックグラウンドで起動する。起動後、ログインセッションのCookieを付けて対象の目標詳細ページ（`SELECT id FROM task_objectives LIMIT 1;`等でローカルDBの既存レコードIDを取得し`/tasks/objectives/<id>`）に`curl -s -o /dev/null -w '%{http_code}'`でアクセスし、200が返ることを確認する。加えて`npm run dev`のサーバーログにエラースタックが出力されていないことを確認する。

サンドボックス環境でブラウザ（Playwright/Chrome）が利用可能であれば、実際にページを開き、コンソールエラーが無いこと・組織ツリーセクションが「タスクグループがまだありません。」（データが無い場合）またはツリー描画のいずれかで表示されることも確認する（過去のフィード連携・進捗サマリ機能と同様、環境上ブラウザが起動できない場合はこのブラウザでの確認は省略し、Task 4 Step 4でまとめて制約を記録する）。

Expected: curlで200が返り、サーバーログにエラーが出ない

- [ ] **Step 8: コミット**

```bash
git add package.json package-lock.json src/features/task-management/components/OrgTreeNodeCard.tsx src/features/task-management/components/OrgTreeCanvas.tsx src/features/task-management/components/OrgTreeSection.tsx "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"
git commit -m "feat: 組織ツリーの読み取り専用ビューアーを目標詳細ページに追加"
```

---

### Task 4: 全体テスト実行・手動E2E確認・PRDステータス更新

**Files:**

- Modify: `docs/implementation-plan-task-management.md`（セクション17.7・セクション12の実装ステータス表）

**Interfaces:**

- Consumes: Task 1〜3の全成果物
- Produces: なし（検証とドキュメント更新のみ）

- [ ] **Step 1: 全体テストスイートを実行する**

Run: `npm test`
Expected: `src/features/data-migration/parse.test.ts`（既知の無関係な既存不具合）以外は全てPASS。`org-tree.test.ts`の7件を含む

- [ ] **Step 2: 型チェック・Lintをリポジトリ全体で実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 3: 本番ビルドを実行する**

Run: `npm run build`
Expected: ビルド成功（`@xyflow/react`が目標詳細ページのルートチャンクとして分離され、他ページのバンドルサイズに影響しないことをビルド出力のルート別サイズ一覧で確認する）

- [ ] **Step 4: ローカルDBのデータ有無を確認し、手動E2E確認を試みる**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:55422/postgres" -c "SELECT (SELECT COUNT(*) FROM task_objectives) AS objectives, (SELECT COUNT(*) FROM task_groups) AS groups, (SELECT COUNT(*) FROM task_group_managers) AS managers, (SELECT COUNT(*) FROM task_group_members) AS members, (SELECT COUNT(*) FROM tasks) AS tasks;"`

データが十分にあれば（`task_group_managers`/`task_group_members`/`tasks`のいずれかが1件以上）、Playwright等でブラウザ操作によるライブE2E確認（目標詳細ページにアクセスし、組織ツリーが責任者ノードを頂点に正しい階層で表示されること、各ノードのタスク数・進捗率バッジが表示されること）を実施する。

データが無い、またはサンドボックス環境でブラウザが起動できない場合は、フィード連携機能（PRDセクション16.6）・進捗サマリ機能（同15.5）と同じ制約として、その旨をPRDに正直に記録する（データ不足・ブラウザ起動不可の両方、またはいずれかを明記する）。

- [ ] **Step 5: PRDのセクション17.7・セクション12を更新する**

`docs/implementation-plan-task-management.md`のセクション17.7の実装ステータス表（4行、Task1〜4に対応）を全て「完了」に更新する。表の直後に、Step 4で確認した手動E2E確認の実施結果（データ有無・ブラウザ起動可否・実施できた場合はその内容、できなかった場合はその理由）を1段落で追記する。

セクション12の実装ステータス表の「Phase 3」行を、フィード連携完了時点の記載

```
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 一部完了（進捗サマリ・通知連携完了／組織ツリーは実装中／残り1項目は未着手） |
```

から、以下に更新する。

```
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 一部完了（組織ツリー・進捗サマリ・通知連携完了／残り1項目〔状態変化アニメーション〕は未着手） |
```

- [ ] **Step 6: コミット**

```bash
git add docs/implementation-plan-task-management.md
git commit -m "docs: 組織ツリー可視化機能のPRDステータスを更新"
```
