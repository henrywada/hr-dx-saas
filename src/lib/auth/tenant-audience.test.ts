import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMyouTenantIds, isTenantAllowedForAudience } from './tenant-audience'

const IDS = ['tenant-public', 'tenant-local']

test('default: MYOU テナントは拒否', () => {
  assert.equal(isTenantAllowedForAudience('default', 'tenant-public', IDS), false)
  assert.equal(isTenantAllowedForAudience('default', 'tenant-local', IDS), false)
})
test('default: 他テナントと tenant 不明は許可（従来動作）', () => {
  assert.equal(isTenantAllowedForAudience('default', 'other', IDS), true)
  assert.equal(isTenantAllowedForAudience('default', null, IDS), true)
})
test('myou: MYOU テナントのみ許可', () => {
  assert.equal(isTenantAllowedForAudience('myou', 'tenant-local', IDS), true)
  assert.equal(isTenantAllowedForAudience('myou', 'other', IDS), false)
})
test('myou: tenant 不明は拒否', () => {
  assert.equal(isTenantAllowedForAudience('myou', null, IDS), false)
  assert.equal(isTenantAllowedForAudience('myou', undefined, IDS), false)
})
test('myou: 環境変数未設定（空配列）は全員拒否 / default は全員許可', () => {
  assert.equal(isTenantAllowedForAudience('myou', 'x', []), false)
  assert.equal(isTenantAllowedForAudience('default', 'x', []), true)
})
test('getMyouTenantIds: 空文字・未設定を除外、前後空白を除去', () => {
  assert.deepEqual(getMyouTenantIds({ MYOU_PUBLIC_TENANT_ID: ' a ', MYOU_LOCAL_TENANT_ID: '' }), [
    'a',
  ])
  assert.deepEqual(getMyouTenantIds({}), [])
})
