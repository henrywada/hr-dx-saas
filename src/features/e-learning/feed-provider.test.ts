import assert from 'node:assert/strict'
import test from 'node:test'
import { toJSTDateString } from '@/lib/datetime'
import { toELearningFeedItems, type ElAssignmentWithCourse } from './feed-provider'
import type { ElCourse } from './types'

const today = toJSTDateString()

function course(overrides: Partial<ElCourse>): ElCourse {
  return {
    id: 'course-1',
    tenant_id: 't-1',
    title: 'テストコース',
    description: null,
    category: '一般',
    status: 'published',
    course_type: 'tenant',
    original_course_id: null,
    thumbnail_url: null,
    estimated_minutes: 10,
    created_by_employee_id: null,
    bloom_level: null,
    learning_objectives: null,
    published_start_date: null,
    published_end_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function assignment(overrides: Partial<ElAssignmentWithCourse>): ElAssignmentWithCourse {
  return {
    id: 'a-1',
    tenant_id: 't-1',
    course_id: 'course-1',
    employee_id: 'e-1',
    assigned_by_employee_id: null,
    due_date: null,
    assigned_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    course: course({}),
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toELearningFeedItems([]), [])
})

test('修了済みの割当は除外する', () => {
  const items = toELearningFeedItems([assignment({ completed_at: '2026-01-05T00:00:00.000Z' })])
  assert.deepEqual(items, [])
})

test('下書き・アーカイブ状態のコースは除外する', () => {
  const items = toELearningFeedItems([assignment({ course: course({ status: 'draft' }) })])
  assert.deepEqual(items, [])
})

test('公開期間外（開始日未到達）のコースは除外する', () => {
  const future = '2999-01-01'
  const items = toELearningFeedItems([
    assignment({ course: course({ published_start_date: future }) }),
  ])
  assert.deepEqual(items, [])
})

test('期限超過は severity=warning、それ以外は action', () => {
  const items = toELearningFeedItems([
    assignment({ id: 'overdue', due_date: '2020-01-01' }),
    assignment({ id: 'ontime', due_date: null }),
  ])
  assert.equal(items.find(i => i.dedupeKey === 'e_learning:overdue')?.severity, 'warning')
  assert.equal(items.find(i => i.dedupeKey === 'e_learning:ontime')?.severity, 'action')
})

test('assignment.id をキーに受講画面へのリンクを生成する', () => {
  const items = toELearningFeedItems([assignment({ id: 'abc' })])
  assert.equal(items[0].dedupeKey, 'e_learning:abc')
  assert.equal(items[0].href, '/el-courses/abc')
  assert.equal(items[0].title, 'テストコース')
})

test('due_date が今日ちょうどなら期限超過にしない', () => {
  const items = toELearningFeedItems([assignment({ due_date: today })])
  assert.equal(items[0].severity, 'action')
})
