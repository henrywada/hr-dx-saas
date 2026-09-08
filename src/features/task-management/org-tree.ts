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
