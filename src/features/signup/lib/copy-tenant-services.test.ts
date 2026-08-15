import assert from 'node:assert/strict'
import test from 'node:test'
import { mapDashboardUiCopyRows, mapTenantServiceCopyRows } from './copy-tenant-services'

test('tenant_service コピー行は新テナントIDと当日の start_date を使う', () => {
  const rows = mapTenantServiceCopyRows(
    [{ service_id: 'svc-1', status: 'active' }],
    'new-tenant',
    '2026-08-15'
  )
  assert.deepEqual(rows, [
    {
      tenant_id: 'new-tenant',
      service_id: 'svc-1',
      status: 'active',
      start_date: '2026-08-15',
    },
  ])
})

test('dashboard UI コピー行はオーバーライドを新テナントへ付け替える', () => {
  const rows = mapDashboardUiCopyRows(
    [{ ui_dashboard_element_id: 'el-1', is_visible: false }],
    'new-tenant'
  )
  assert.deepEqual(rows, [
    {
      tenant_id: 'new-tenant',
      ui_dashboard_element_id: 'el-1',
      is_visible: false,
    },
  ])
})

test('dashboard UI コピー元が空なら空配列（全表示のデフォルト）', () => {
  assert.deepEqual(mapDashboardUiCopyRows([], 'new-tenant'), [])
})
