import assert from 'node:assert/strict'
import test from 'node:test'
import { generateInviteToken, inviteExpiryDate } from './inviteToken'

test('generateInviteToken: URL セーフな十分な長さのトークンを返す', () => {
  const token = generateInviteToken()
  assert.match(token, /^[A-Za-z0-9_-]+$/)
  assert.ok(token.length >= 32)
})

test('generateInviteToken: 呼び出しごとに異なるトークンを返す', () => {
  const a = generateInviteToken()
  const b = generateInviteToken()
  assert.notEqual(a, b)
})

test('inviteExpiryDate: 指定日から 72 時間後の日付を返す', () => {
  const from = new Date('2026-09-02T00:00:00.000Z')
  const expiry = inviteExpiryDate(from)
  assert.equal(expiry.toISOString(), '2026-09-05T00:00:00.000Z')
})

test('inviteExpiryDate: 日付未指定時は現在時刻を基準にする', () => {
  const before = Date.now()
  const expiry = inviteExpiryDate()
  const after = Date.now()
  const seventyTwoHoursMs = 72 * 60 * 60 * 1000
  assert.ok(expiry.getTime() >= before + seventyTwoHoursMs)
  assert.ok(expiry.getTime() <= after + seventyTwoHoursMs)
})
