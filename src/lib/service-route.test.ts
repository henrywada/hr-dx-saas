import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'

import { resolveServiceLinkHref } from './service-route'

const appDir = path.join(process.cwd(), 'src/app')

test('動的セグメントを含む route_path は親の一覧ページへフォールバックする', () => {
  const result = resolveServiceLinkHref('/adm/closure/[closure_id]/timecard', appDir)
  assert.equal(result, '/adm/closure')
})

test('静的 route_path はそのまま返す', () => {
  const result = resolveServiceLinkHref('/adm/job-positions', appDir)
  assert.equal(result, '/adm/job-positions')
})

test('空・未設定は # を返す', () => {
  assert.equal(resolveServiceLinkHref(null), '#')
  assert.equal(resolveServiceLinkHref(''), '#')
})
