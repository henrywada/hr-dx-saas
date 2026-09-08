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
  assert.equal(items[0].dedupeKey, 'task_management:assignment:xyz')
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
  assert.equal(items[0].dedupeKey, 'task_management:comment:c-1')
  assert.equal(items[0].category, 'task_management')
})
