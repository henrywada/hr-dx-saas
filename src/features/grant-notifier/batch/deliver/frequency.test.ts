import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldDeliverForFrequency } from '@/features/grant-notifier/batch/deliver/frequency'

test('週次は当月配信済みかどうかに関わらず常に配信する', () => {
  assert.equal(shouldDeliverForFrequency('weekly', false), true)
  assert.equal(shouldDeliverForFrequency('weekly', true), true)
})

test('月次は当月未配信のときだけ配信する', () => {
  assert.equal(shouldDeliverForFrequency('monthly', false), true)
  assert.equal(shouldDeliverForFrequency('monthly', true), false)
})
