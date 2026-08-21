import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFeedProviderContext } from './provider'
import type { AppUser } from '@/types/auth'

function user(overrides: Partial<AppUser>): AppUser {
  return {
    id: 'u-1',
    name: '山田太郎',
    role: 'member',
    tenant_id: 't-1',
    employee_id: 'e-1',
    division_id: 'd-1',
    appRole: 'employee',
    is_manager: false,
    ...overrides,
  }
}

test('未ログイン（null）なら null を返す', () => {
  assert.equal(buildFeedProviderContext(null), null)
})

test('通常ユーザーは各フィールドをそのままctxへ写す', () => {
  const ctx = buildFeedProviderContext(user({}))
  assert.deepEqual(ctx, {
    employeeId: 'e-1',
    userId: 'u-1',
    tenantId: 't-1',
    divisionId: 'd-1',
    appRole: 'employee',
    isManager: false,
  })
})

test('employee_id が無くても null にせず空文字にフォールバックする', () => {
  const ctx = buildFeedProviderContext(user({ employee_id: undefined }))
  assert.equal(ctx?.employeeId, '')
})

test('tenant_id が無くても空文字にフォールバックする', () => {
  const ctx = buildFeedProviderContext(user({ tenant_id: undefined }))
  assert.equal(ctx?.tenantId, '')
})

test('is_manager が null/undefined なら false に正規化する', () => {
  assert.equal(buildFeedProviderContext(user({ is_manager: null }))?.isManager, false)
  assert.equal(buildFeedProviderContext(user({ is_manager: undefined }))?.isManager, false)
})
