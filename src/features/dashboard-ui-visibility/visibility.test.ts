import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSidebarClassGroups,
  isDashboardElementShown,
  visibleKeysForScreen,
} from './visibility'

const base = {
  id: 'el-1',
  element_key: 'adm.card.pulse',
  service_id: 'svc-1' as string | null,
  screen: 'adm' as const,
  is_active: true,
}

test('契約なしの service 紐付け要素は非表示', () => {
  assert.equal(isDashboardElementShown(base, new Set(), new Set()), false)
})

test('契約ありなら表示', () => {
  assert.equal(isDashboardElementShown(base, new Set(['svc-1']), new Set()), true)
})

test('オーバーライド非表示は契約があっても隠す', () => {
  assert.equal(isDashboardElementShown(base, new Set(['svc-1']), new Set(['el-1'])), false)
})

test('service_id なしは契約不要', () => {
  assert.equal(isDashboardElementShown({ ...base, service_id: null }, new Set(), new Set()), true)
})

test('サイドバーは契約かつ公開かつ画面 audience のカテゴリだけ出す', () => {
  const groups = buildSidebarClassGroups(
    'top',
    new Set(['s1', 's2']),
    [
      {
        id: 's1',
        target_audience: 'all_users',
        release_status: '公開',
        service_category_id: 'cat-a',
      },
      {
        id: 's2',
        target_audience: 'adm',
        release_status: '公開',
        service_category_id: 'cat-b',
      },
    ],
    [
      { id: 'cat-a', name: 'ストレスチェック', sort_order: 1 },
      { id: 'cat-b', name: '組織健康', sort_order: 1 },
    ],
    [{ id: 'cls-1', name: 'ウェルビーイング', sort_order: 1 }],
    [
      { service_category_id: 'cat-a', service_class_id: 'cls-1' },
      { service_category_id: 'cat-b', service_class_id: 'cls-1' },
    ]
  )
  assert.equal(groups.length, 1)
  assert.deepEqual(
    groups[0].categories.map(c => c.name),
    ['ストレスチェック']
  )
})

test('画面別にキーを集約する', () => {
  const keys = visibleKeysForScreen(
    [
      base,
      {
        ...base,
        id: 'el-2',
        element_key: 'top.button.hr_inquiry',
        screen: 'top',
        service_id: null,
      },
    ],
    'top',
    new Set(),
    new Set()
  )
  assert.deepEqual([...keys], ['top.button.hr_inquiry'])
})
