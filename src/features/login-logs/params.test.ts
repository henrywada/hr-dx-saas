import assert from 'node:assert/strict'
import test from 'node:test'

import { LOGIN_LOG_MAX_ROWS, isPastYearMonth, parseTenantId, parseYearMonth } from './params'

// JST 2026-09-15 = UTC 2026-09-15T03:00Z
const NOW = new Date('2026-09-15T03:00:00Z')

test('parseYearMonth: 正常な年月を返す', () => {
  assert.equal(parseYearMonth('2026-09'), '2026-09')
})

test('parseYearMonth: 不正値は null', () => {
  assert.equal(parseYearMonth('2026-13'), null)
  assert.equal(parseYearMonth('2026-00'), null)
  assert.equal(parseYearMonth(''), null)
  assert.equal(parseYearMonth(undefined), null)
  assert.equal(parseYearMonth(202609), null)
  assert.equal(parseYearMonth(['2026-09']), null)
})

test('parseTenantId: UUID のみ許可する', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000'
  assert.equal(parseTenantId(id), id)
  assert.equal(parseTenantId('abc'), null)
  assert.equal(parseTenantId(''), null)
  assert.equal(parseTenantId(null), null)
  assert.equal(parseTenantId(123), null)
})

test('isPastYearMonth: 前月は true、当月・未来月は false', () => {
  assert.equal(isPastYearMonth('2026-08', NOW), true)
  assert.equal(isPastYearMonth('2026-09', NOW), false)
  assert.equal(isPastYearMonth('2026-10', NOW), false)
})

test('isPastYearMonth: JST 基準で当月を判定する（UTC月末はJST翌月）', () => {
  // UTC 2026-08-31T20:00Z = JST 2026-09-01 05:00
  const boundary = new Date('2026-08-31T20:00:00Z')
  assert.equal(isPastYearMonth('2026-08', boundary), true)
  assert.equal(isPastYearMonth('2026-09', boundary), false)
})

test('isPastYearMonth: 不正形式は false', () => {
  assert.equal(isPastYearMonth('2026-13', NOW), false)
  assert.equal(isPastYearMonth('', NOW), false)
  assert.equal(isPastYearMonth('abc', NOW), false)
})

test('LOGIN_LOG_MAX_ROWS は 5000', () => {
  assert.equal(LOGIN_LOG_MAX_ROWS, 5000)
})
