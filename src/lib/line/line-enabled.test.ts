import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLineEnabledForTenant } from './line-enabled'

const IDS = ['tenant-public', 'tenant-local']

test('MYOU テナントは LINE 連携を無効', () => {
  assert.equal(isLineEnabledForTenant('tenant-public', IDS), false)
  assert.equal(isLineEnabledForTenant('tenant-local', IDS), false)
})
test('他テナント・tenant 不明は従来どおり有効', () => {
  assert.equal(isLineEnabledForTenant('other', IDS), true)
  assert.equal(isLineEnabledForTenant(null, IDS), true)
  assert.equal(isLineEnabledForTenant(undefined, IDS), true)
})
test('環境変数未設定（空配列）は全テナント有効（従来動作）', () => {
  assert.equal(isLineEnabledForTenant('tenant-public', []), true)
})
