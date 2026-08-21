import assert from 'node:assert/strict'
import test from 'node:test'
import { toHealthCheckFeedItems } from './feed-provider'
import type { HealthCheckSummaryForInterview } from './types'

function summary(
  overrides: Partial<HealthCheckSummaryForInterview>
): HealthCheckSummaryForInterview {
  return {
    examDate: '2026-06-01',
    overallStandardCode: null,
    employmentJudgment: null,
    nurseInterviewRecommended: false,
    doctorInterviewRecommended: false,
    ...overrides,
  }
}

test('レコードが無ければ空配列を返す', () => {
  assert.deepEqual(toHealthCheckFeedItems(null), [])
})

test('面談推奨が両方falseなら空配列を返す', () => {
  assert.deepEqual(toHealthCheckFeedItems(summary({})), [])
})

test('産業医面談推奨のみtrueなら1件返す', () => {
  const items = toHealthCheckFeedItems(summary({ doctorInterviewRecommended: true }))
  assert.equal(items.length, 1)
  assert.match(items[0].title, /産業医/)
  assert.equal(items[0].dedupeKey, 'health_check:doctor_interview:2026-06-01')
})

test('保健師面談推奨のみtrueなら1件返す', () => {
  const items = toHealthCheckFeedItems(summary({ nurseInterviewRecommended: true }))
  assert.equal(items.length, 1)
  assert.match(items[0].title, /保健師/)
})

test('両方trueなら2件返す', () => {
  const items = toHealthCheckFeedItems(
    summary({ nurseInterviewRecommended: true, doctorInterviewRecommended: true })
  )
  assert.equal(items.length, 2)
})

test('全項目 /health-check へのリンクを持つ', () => {
  const items = toHealthCheckFeedItems(
    summary({ nurseInterviewRecommended: true, doctorInterviewRecommended: true })
  )
  assert.ok(items.every(i => i.href === '/health-check'))
})
