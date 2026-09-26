import assert from 'node:assert/strict'
import test from 'node:test'
import { formatStayDuration, toStaySeconds } from './session'

test('最終操作がログイン時刻と同じなら滞在時間は0秒', () => {
  assert.equal(toStaySeconds('2026-09-26T10:00:00Z', '2026-09-26T10:00:00Z'), 0)
})

test('最終操作との差を秒で返す', () => {
  assert.equal(toStaySeconds('2026-09-26T10:00:00Z', '2026-09-26T10:32:10Z'), 1930)
})

test('最終操作が無い/不正/ログイン前なら null', () => {
  assert.equal(toStaySeconds('2026-09-26T10:00:00Z', null), null)
  assert.equal(toStaySeconds('2026-09-26T10:00:00Z', 'invalid'), null)
  assert.equal(toStaySeconds('2026-09-26T10:00:00Z', '2026-09-26T09:59:59Z'), null)
})

test('60秒未満は「1分未満」', () => {
  assert.equal(formatStayDuration(0), '1分未満')
  assert.equal(formatStayDuration(59), '1分未満')
})

test('60分未満は分表示、以降は時間+分表示', () => {
  assert.equal(formatStayDuration(60), '1分')
  assert.equal(formatStayDuration(1930), '32分')
  assert.equal(formatStayDuration(3600), '1時間0分')
  assert.equal(formatStayDuration(5400), '1時間30分')
})

test('null は「---」', () => {
  assert.equal(formatStayDuration(null), '---')
})
