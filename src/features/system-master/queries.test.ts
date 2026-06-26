import assert from 'node:assert/strict'
import test from 'node:test'

import { withAiAdviceAvailability } from './queries'

test('route_path に対応するファイルがあれば true になる', () => {
  const rows = [{ id: 's1', route_path: '/adm/job-positions' }]
  const result = withAiAdviceAvailability(rows, () => '/abs/path/page.tsx')
  assert.equal(result[0].ai_advice_available, true)
})

test('route_path に対応するファイルがなければ false になる', () => {
  const rows = [{ id: 's1', route_path: '/no-such-route' }]
  const result = withAiAdviceAvailability(rows, () => null)
  assert.equal(result[0].ai_advice_available, false)
})

test('元の行の他フィールドは保持される', () => {
  const rows = [{ id: 's1', route_path: '/adm/x', name: 'テスト' }]
  const result = withAiAdviceAvailability(rows, () => '/abs/path/page.tsx')
  assert.equal(result[0].name, 'テスト')
})
