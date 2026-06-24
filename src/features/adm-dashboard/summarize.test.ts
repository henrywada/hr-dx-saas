import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeQuestionnaires } from './summarize'
import type { QuestionnaireListItem } from '@/features/questionnaire/types'

function makeItem(overrides: Partial<QuestionnaireListItem>): QuestionnaireListItem {
  return {
    id: 'q-1',
    creator_type: 'tenant',
    tenant_id: 'tenant-1',
    title: 'テストアンケート',
    description: null,
    status: 'active',
    created_by_employee_id: null,
    created_at: '2026-06-01T00:00:00+09:00',
    updated_at: '2026-06-01T00:00:00+09:00',
    question_count: 5,
    assignment_count: 0,
    submitted_count: 0,
    period_count: 1,
    has_ongoing_period_display: true,
    ongoing_period_start_date: '2026-06-01',
    ongoing_period_end_date: '2026-06-30',
    ...overrides,
  }
}

test('counts only active questionnaires and averages response rate across them', () => {
  const items = [
    makeItem({ id: 'q-1', status: 'active', assignment_count: 100, submitted_count: 80 }),
    makeItem({ id: 'q-2', status: 'active', assignment_count: 50, submitted_count: 25 }),
    makeItem({ id: 'q-3', status: 'draft', assignment_count: 10, submitted_count: 10 }),
    makeItem({ id: 'q-4', status: 'closed', assignment_count: 10, submitted_count: 10 }),
  ]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 2)
  // (80/100 + 25/50) / 2 = (0.8 + 0.5) / 2 = 0.65 → 65%
  assert.equal(summary.averageResponseRatePercent, 65)
})

test('ignores active questionnaires with zero assignments when averaging response rate', () => {
  const items = [
    makeItem({ id: 'q-1', status: 'active', assignment_count: 0, submitted_count: 0 }),
    makeItem({ id: 'q-2', status: 'active', assignment_count: 20, submitted_count: 10 }),
  ]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 2)
  assert.equal(summary.averageResponseRatePercent, 50)
})

test('returns null average response rate when there are no active questionnaires with assignments', () => {
  const items = [makeItem({ id: 'q-1', status: 'draft', assignment_count: 5, submitted_count: 1 })]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 0)
  assert.equal(summary.averageResponseRatePercent, null)
})
