import assert from 'node:assert/strict'
import test from 'node:test'

import { getEvaluationReminderRecipientId } from './evaluation-reminder-mail'

test('自己評価フェーズは被評価者へ催促', () => {
  assert.equal(
    getEvaluationReminderRecipientId({
      employee_id: 'emp-1',
      flow_status: 'self_eval',
      primary_evaluator_id: 'mgr-1',
      secondary_evaluator_id: null,
      confirmer_id: null,
    }),
    'emp-1',
  )
})

test('一次評価フェーズは一次評価者へ催促', () => {
  assert.equal(
    getEvaluationReminderRecipientId({
      employee_id: 'emp-1',
      flow_status: 'primary_eval',
      primary_evaluator_id: 'mgr-1',
      secondary_evaluator_id: null,
      confirmer_id: null,
    }),
    'mgr-1',
  )
})
