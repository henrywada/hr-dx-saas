import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOrgTreeGraph,
  layoutOrgTree,
  type OrgTreeNodeData,
  type OrgTreeEdge,
} from './org-tree'

function edgePairs(edges: { source: string; target: string }[]): [string, string][] {
  return edges.map(e => [e.source, e.target])
}

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
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 20,
      },
      {
        id: 't2',
        taskGroupId: 'g1',
        title: 'タスク2',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 60,
      },
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
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 100,
      },
      {
        id: 't2',
        taskGroupId: 'g2',
        title: 'タスク2',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 0,
      },
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
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 100,
      },
      {
        id: 't2',
        taskGroupId: 'g1',
        title: 'タスク2',
        goalSummary: null,
        assignees: [],
        progressPercent: 0,
      },
    ],
  })

  const groupNode = nodes.find(n => n.id === 'group:g1')
  const memberNode = nodes.find(n => n.id === 'member:g1:e1')

  assert.equal(groupNode?.taskCount, 2)
  assert.equal(groupNode?.progressPercent, 50)
  assert.equal(memberNode?.taskCount, 1)
  assert.equal(memberNode?.progressPercent, 100)
})

test('buildOrgTreeGraph: 1タスクに複数担当者がいる場合、進捗が両方の担当者に計上される', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'e2', employeeName: '高橋' },
        ],
      },
    ],
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'e2', employeeName: '高橋' },
        ],
        progressPercent: 80,
      },
    ],
  })

  const groupNode = nodes.find(n => n.id === 'group:g1')
  const member1 = nodes.find(n => n.id === 'member:g1:e1')
  const member2 = nodes.find(n => n.id === 'member:g1:e2')

  assert.equal(groupNode?.taskCount, 1)
  assert.equal(groupNode?.progressPercent, 80)
  assert.equal(member1?.taskCount, 1)
  assert.equal(member1?.progressPercent, 80)
  assert.equal(member2?.taskCount, 1)
  assert.equal(member2?.progressPercent, 80)
})

test('buildOrgTreeGraph: タスクグループの子にtaskノードを並列追加し、その子にtask_assigneeノードを配置する', () => {
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
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: '改善立案',
        goalSummary: '改善案の3案を立案',
        assignees: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'm1', employeeName: '佐藤' },
        ],
        progressPercent: 40,
      },
    ],
  })

  const pairs = edgePairs(edges)

  // 既存の group→manager/member エッジは維持されたまま（並列追加）
  assert.ok(pairs.some(([s, t]) => s === 'group:g1' && t === 'manager:g1:m1'))

  const taskNode = nodes.find(n => n.id === 'task:t1')
  assert.deepEqual(taskNode, {
    id: 'task:t1',
    label: '改善立案',
    role: 'task',
    taskCount: 1,
    progressPercent: 40,
    goalSummary: '改善案の3案を立案',
  })
  assert.ok(pairs.some(([s, t]) => s === 'group:g1' && t === 'task:t1'))

  const assignee1 = nodes.find(n => n.id === 'task-assignee:t1:e1')
  const assignee2 = nodes.find(n => n.id === 'task-assignee:t1:m1')
  assert.equal(assignee1?.label, '鈴木')
  assert.equal(assignee1?.role, 'task_assignee')
  assert.equal(assignee2?.label, '佐藤')
  assert.ok(pairs.some(([s, t]) => s === 'task:t1' && t === 'task-assignee:t1:e1'))
  assert.ok(pairs.some(([s, t]) => s === 'task:t1' && t === 'task-assignee:t1:m1'))
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
