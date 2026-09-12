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
