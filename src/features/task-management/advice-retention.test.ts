import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeStaleAdviceItems,
  toAdviceDedupeKey,
  type AdviceCommentInput,
} from './advice-retention'

function comment(overrides: Partial<AdviceCommentInput> = {}): AdviceCommentInput {
  return {
    commentId: 'c-1',
    taskGroupId: 'g-1',
    taskId: 't-1',
    senderEmployeeId: 'sender-1',
    targetEmployeeId: 'target-1',
    createdAt: '2026-08-31T00:00:00.000Z',
    ...overrides,
  }
}

test('toAdviceDedupeKey: 既存フィードと同じ task_management:comment:{id} 形式', () => {
  assert.equal(toAdviceDedupeKey('c-1'), 'task_management:comment:c-1')
})

test('computeStaleAdviceItems: 空配列なら空配列を返す', () => {
  assert.deepEqual(computeStaleAdviceItems([], [], 14, new Date('2026-09-14T00:00:00.000Z')), [])
})

test('computeStaleAdviceItems: ちょうど閾値日数の未読は放置と判定する（境界値）', () => {
  const items = computeStaleAdviceItems(
    [comment({ createdAt: '2026-08-31T00:00:00+09:00' })],
    [],
    14,
    new Date('2026-09-14T00:00:00+09:00')
  )
  assert.equal(items.length, 1)
  assert.equal(items[0].commentId, 'c-1')
  assert.equal(items[0].daysElapsed, 14)
})

test('computeStaleAdviceItems: 閾値未満の未読は放置にならない（境界値）', () => {
  const items = computeStaleAdviceItems(
    [comment({ createdAt: '2026-09-01T00:00:00+09:00' })],
    [],
    14,
    new Date('2026-09-14T00:00:00+09:00')
  )
  assert.equal(items.length, 0)
})

test('computeStaleAdviceItems: 既読のadviceは日数が閾値以上でも除外する', () => {
  const items = computeStaleAdviceItems(
    [comment({ commentId: 'c-read', createdAt: '2026-08-01T00:00:00.000Z' })],
    [{ dedupeKey: toAdviceDedupeKey('c-read') }],
    14,
    new Date('2026-09-14T00:00:00+09:00')
  )
  assert.equal(items.length, 0)
})

test('computeStaleAdviceItems: 未読かつ閾値超過のみを返し、入力フィールドを保持する', () => {
  const items = computeStaleAdviceItems(
    [
      comment({
        commentId: 'c-stale',
        taskGroupId: 'g-9',
        taskId: null,
        senderEmployeeId: 's-9',
        targetEmployeeId: 't-9',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
      comment({ commentId: 'c-fresh', createdAt: '2026-09-13T00:00:00.000Z' }),
      comment({
        commentId: 'c-read',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ],
    [{ dedupeKey: toAdviceDedupeKey('c-read') }],
    14,
    new Date('2026-09-14T00:00:00+09:00')
  )

  assert.equal(items.length, 1)
  assert.equal(items[0].commentId, 'c-stale')
  assert.equal(items[0].taskGroupId, 'g-9')
  assert.equal(items[0].taskId, null)
  assert.equal(items[0].senderEmployeeId, 's-9')
  assert.equal(items[0].targetEmployeeId, 't-9')
  assert.equal(items[0].createdAt, '2026-08-01T00:00:00.000Z')
  assert.ok(items[0].daysElapsed >= 14)
})
