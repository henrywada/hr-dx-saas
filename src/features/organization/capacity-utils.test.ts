import assert from 'node:assert/strict'
import test from 'node:test'

import { computeEmployeeCapacity, countEmployeesByRole } from './capacity-utils'

test('countEmployeesByRole は産業医と一般ユーザを分離する', () => {
  const rows = [
    { app_role: { app_role: 'employee' } },
    { app_role: { app_role: 'company_doctor' } },
    { app_role: { app_role: 'hr' } },
  ]
  const counts = countEmployeesByRole(rows)
  assert.equal(counts.registered_user_count, 2)
  assert.equal(counts.company_doctor_count, 1)
})

test('computeEmployeeCapacity は上限と残数を計算する', () => {
  const { limit, remaining } = computeEmployeeCapacity(10, 7, 1)
  assert.equal(limit, 10)
  assert.equal(remaining, 2)
})

test('computeEmployeeCapacity は上限未設定時に remaining を null にする', () => {
  const { limit, remaining } = computeEmployeeCapacity(null, 3, 0)
  assert.equal(limit, null)
  assert.equal(remaining, null)
})
