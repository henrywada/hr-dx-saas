import assert from 'node:assert/strict'
import test from 'node:test'

import { isTaskOverdue, canManageLifecycle } from './types'

test('due_dateが今日より過去なら期限超過と判定される', () => {
  assert.equal(isTaskOverdue('2026-06-01', '2026-06-29'), true)
})

test('due_dateが今日なら期限超過ではない', () => {
  assert.equal(isTaskOverdue('2026-06-29', '2026-06-29'), false)
})

test('due_dateが未来なら期限超過ではない', () => {
  assert.equal(isTaskOverdue('2026-07-01', '2026-06-29'), false)
})

test('due_dateがnullなら期限超過ではない', () => {
  assert.equal(isTaskOverdue(null, '2026-06-29'), false)
})

test('hr/hr_manager/tenant_admin/developerは管理権限がある', () => {
  assert.equal(canManageLifecycle('hr'), true)
  assert.equal(canManageLifecycle('hr_manager'), true)
  assert.equal(canManageLifecycle('tenant_admin'), true)
  assert.equal(canManageLifecycle('developer'), true)
})

test('employeeは管理権限がない', () => {
  assert.equal(canManageLifecycle('employee'), false)
})

test('appRoleがnull/undefinedなら管理権限がない', () => {
  assert.equal(canManageLifecycle(null), false)
  assert.equal(canManageLifecycle(undefined), false)
})
