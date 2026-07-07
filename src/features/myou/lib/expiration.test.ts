import assert from 'node:assert/strict'
import test from 'node:test'

import { getDaysUntilExpiration } from './expiration'

// JST 2026-07-08 09:00 = UTC 2026-07-08 00:00
const now = new Date('2026-07-08T00:00:00Z')

test('期限当日は 0 を返す', () => {
  assert.equal(getDaysUntilExpiration('2026-07-08', now), 0)
})

test('30日後の期限は 30 を返す', () => {
  assert.equal(getDaysUntilExpiration('2026-08-07', now), 30)
})

test('過去の期限は負数を返す', () => {
  assert.equal(getDaysUntilExpiration('2026-07-01', now), -7)
})

test('UTC ではまだ前日でも JST の暦日を基準に計算する', () => {
  // UTC 2026-07-07 20:00 = JST 2026-07-08 05:00 → JST の「今日」は 7/8
  const lateUtc = new Date('2026-07-07T20:00:00Z')
  assert.equal(getDaysUntilExpiration('2026-07-08', lateUtc), 0)
  assert.equal(getDaysUntilExpiration('2026-07-09', lateUtc), 1)
})

test('未設定・不正な日付は null を返す', () => {
  assert.equal(getDaysUntilExpiration(null, now), null)
  assert.equal(getDaysUntilExpiration('invalid-date', now), null)
})
