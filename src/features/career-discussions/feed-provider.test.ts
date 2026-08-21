import assert from 'node:assert/strict'
import test from 'node:test'
import { toCareerDiscussionFeedItems } from './feed-provider'
import type { CareerAppointmentRow } from './types'

function row(overrides: Partial<CareerAppointmentRow>): CareerAppointmentRow {
  return {
    id: 'c-1',
    employee_id: 'e-1',
    employee_name: '山田太郎',
    scheduled_by_employee_id: 'm-1',
    scheduled_by_name: '田中部長',
    department_name: null,
    theme: 'キャリアプランについて',
    scheduled_at: '2026-08-25T01:00:00.000Z',
    status: 'scheduled',
    notes: null,
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toCareerDiscussionFeedItems([], '2026-08-20'), [])
})

test('id をキーにdedupeKeyとリンクを生成する', () => {
  const items = toCareerDiscussionFeedItems([row({ id: 'xyz' })], '2026-08-20')
  assert.equal(items[0].dedupeKey, 'career_discussion:xyz')
  assert.equal(items[0].href, '/career-discussions')
})

test('3日以内に迫っていれば warning、それ以外は info', () => {
  const near = row({ id: 'near', scheduled_at: '2026-08-22T01:00:00.000Z' })
  const far = row({ id: 'far', scheduled_at: '2026-09-01T01:00:00.000Z' })
  const items = toCareerDiscussionFeedItems([near, far], '2026-08-20')
  assert.equal(items.find(i => i.dedupeKey === 'career_discussion:near')?.severity, 'warning')
  assert.equal(items.find(i => i.dedupeKey === 'career_discussion:far')?.severity, 'info')
})

test('テーマをbodyに使う', () => {
  const items = toCareerDiscussionFeedItems([row({ theme: '異動希望について' })], '2026-08-20')
  assert.equal(items[0].body, '異動希望について')
})
