import assert from 'node:assert/strict'
import test from 'node:test'
import { toQuestionnaireFeedItems } from './feed-provider'
import type { AssignedQuestionnaire } from './types'

function assignment(overrides: Partial<AssignedQuestionnaire>): AssignedQuestionnaire {
  return {
    assignment_id: 'a-1',
    questionnaire_id: 'q-1',
    title: 'テストアンケート',
    description: null,
    deadline_date: null,
    assigned_at: '2026-08-01T00:00:00.000Z',
    submitted_at: null,
    creator_type: 'tenant',
    questionnaire_status: 'active',
    period_id: null,
    period_label: null,
    period_start_date: null,
    period_end_date: null,
    hr_message: null,
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toQuestionnaireFeedItems([]), [])
})

test('assignment_id をキーにdedupeKeyと回答リンクを生成する', () => {
  const items = toQuestionnaireFeedItems([assignment({ assignment_id: 'abc' })])
  assert.equal(items[0].dedupeKey, 'questionnaire:abc')
  assert.equal(items[0].href, '/answers?id=abc')
  assert.equal(items[0].kind, 'action_prompt')
  assert.equal(items[0].actionLabel, '回答する')
})

test('period_end_date があればdueDateに使う（deadline_dateより優先）', () => {
  const items = toQuestionnaireFeedItems([
    assignment({ period_end_date: '2026-08-31', deadline_date: '2026-09-30' }),
  ])
  assert.equal(items[0].dueDate, '2026-08-31')
})

test('period_end_date がなければdeadline_dateを使う', () => {
  const items = toQuestionnaireFeedItems([
    assignment({ period_end_date: null, deadline_date: '2026-09-30' }),
  ])
  assert.equal(items[0].dueDate, '2026-09-30')
})

test('hr_message のみあればそれをbodyに使う', () => {
  const withMessage = toQuestionnaireFeedItems([
    assignment({
      hr_message: '至急回答してください',
      period_start_date: null,
      period_end_date: null,
    }),
  ])
  assert.equal(withMessage[0].body, '至急回答してください')
})

test('hr_message がなければ期間表示にフォールバックする', () => {
  const withoutMessage = toQuestionnaireFeedItems([
    assignment({
      hr_message: null,
      period_start_date: '2026-08-01',
      period_end_date: '2026-08-31',
    }),
  ])
  assert.equal(withoutMessage[0].body, '実施期間：2026-08-01 ～ 2026-08-31')
})

test('hr_message と期間表示が両方あれば連結して情報を欠落させない', () => {
  const items = toQuestionnaireFeedItems([
    assignment({
      hr_message: '至急回答してください',
      period_start_date: '2026-08-01',
      period_end_date: '2026-08-31',
    }),
  ])
  assert.equal(items[0].body, '実施期間：2026-08-01 ～ 2026-08-31\n至急回答してください')
})
