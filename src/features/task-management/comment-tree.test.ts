import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCommentTree } from './comment-tree'
import type { TaskComment } from './types'

function comment(overrides: Partial<TaskComment>): TaskComment {
  return {
    id: 'c-1',
    tenantId: 't-1',
    taskId: 'task-1',
    taskGroupId: null,
    employeeId: 'e-1',
    employeeName: '山田太郎',
    parentCommentId: null,
    commentType: 'general',
    body: 'コメント本文',
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(buildCommentTree([]), [])
})

test('親コメントのみの場合はrepliesが空配列のルートノードになる', () => {
  const tree = buildCommentTree([comment({ id: 'c-1' })])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 'c-1')
  assert.deepEqual(tree[0].replies, [])
})

test('parentCommentIdで正しく親の下にネストされる', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', parentCommentId: null }),
    comment({ id: 'c-2', parentCommentId: 'c-1' }),
  ])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].replies.length, 1)
  assert.equal(tree[0].replies[0].id, 'c-2')
})

test('複数のルートコメントを作成日時の昇順で保持する', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', createdAt: '2026-09-07T00:00:00.000Z' }),
    comment({ id: 'c-2', createdAt: '2026-09-07T01:00:00.000Z' }),
  ])
  assert.deepEqual(
    tree.map(n => n.id),
    ['c-1', 'c-2']
  )
})

test('存在しないparentCommentIdを持つコメントはルートとして扱う（親が削除済みのケース）', () => {
  const tree = buildCommentTree([comment({ id: 'c-1', parentCommentId: 'missing-parent' })])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 'c-1')
})

test('3階層目の返信も正しくネストされる', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', parentCommentId: null }),
    comment({ id: 'c-2', parentCommentId: 'c-1' }),
    comment({ id: 'c-3', parentCommentId: 'c-2' }),
  ])
  assert.equal(tree[0].replies[0].replies[0].id, 'c-3')
})
