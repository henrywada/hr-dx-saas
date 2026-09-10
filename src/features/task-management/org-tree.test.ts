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
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 20 },
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 60 },
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
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 100 },
      { taskGroupId: 'g2', assigneeEmployeeIds: ['e1'], progressPercent: 0 },
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
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 100 },
      { taskGroupId: 'g1', assigneeEmployeeIds: [], progressPercent: 0 },
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
    tasks: [{ taskGroupId: 'g1', assigneeEmployeeIds: ['e1', 'e2'], progressPercent: 80 }],
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
