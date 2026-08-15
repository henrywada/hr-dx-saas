import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canEnablePlanSync,
  canReplaceTenantServices,
  classifyServiceSync,
  isSyncTargetTenant,
} from './sync'

test('テンプレート自身は同期対象外、同じ plan_type の既存テナントだけ対象', () => {
  assert.equal(isSyncTargetTenant({ plan_type: 'free', is_template: false }, 'free'), true)
  assert.equal(isSyncTargetTenant({ plan_type: 'free', is_template: true }, 'free'), false)
  assert.equal(isSyncTargetTenant({ plan_type: 'plan100', is_template: false }, 'free'), false)
})

test('既存テナントが0件なら同期ボタンは無効', () => {
  assert.equal(canEnablePlanSync(0), false)
  assert.equal(canEnablePlanSync(1), true)
})

test('テンプレートのサービスが0件なら置き換え不可', () => {
  assert.equal(canReplaceTenantServices(0), false)
  assert.equal(canReplaceTenantServices(3), true)
})

test('サービス差分は追加・削除・status更新に分ける', () => {
  const current = [
    { service_id: 'keep', status: 'active' },
    { service_id: 'remove', status: 'active' },
    { service_id: 'status-change', status: 'active' },
  ]
  const template = [
    { service_id: 'keep', status: 'active' },
    { service_id: 'add', status: 'active' },
    { service_id: 'status-change', status: 'inactive' },
  ]

  const diff = classifyServiceSync(current, template)
  assert.deepEqual(
    diff.toAdd.map(r => r.service_id),
    ['add']
  )
  assert.deepEqual(
    diff.toRemove.map(r => r.service_id),
    ['remove']
  )
  assert.deepEqual(
    diff.toUpdateStatus.map(r => r.service_id),
    ['status-change']
  )
})
