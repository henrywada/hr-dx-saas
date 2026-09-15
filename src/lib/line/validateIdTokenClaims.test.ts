import assert from 'node:assert/strict'
import test from 'node:test'
import { validateLineIdTokenClaims } from './validateIdTokenClaims'

const channelId = '1234567890'
const nowSeconds = 1_800_000_000

function baseClaims() {
  return {
    sub: 'U1234567890abcdef1234567890abcdef',
    aud: channelId,
    iss: 'https://access.line.me',
    exp: nowSeconds + 3600,
  }
}

test('validateLineIdTokenClaims: 有効な claims から LINE ユーザー ID を返す', () => {
  const result = validateLineIdTokenClaims(baseClaims(), { channelId, nowSeconds })
  assert.deepEqual(result, { lineUserId: 'U1234567890abcdef1234567890abcdef' })
})

test('validateLineIdTokenClaims: 不正な issuer を拒否する', () => {
  const claims = { ...baseClaims(), iss: 'https://evil.example.com' }
  assert.throws(() => validateLineIdTokenClaims(claims, { channelId, nowSeconds }))
})

test('validateLineIdTokenClaims: 不正な audience を拒否する', () => {
  const claims = { ...baseClaims(), aud: 'some-other-channel' }
  assert.throws(() => validateLineIdTokenClaims(claims, { channelId, nowSeconds }))
})

test('validateLineIdTokenClaims: 期限切れトークンを拒否する', () => {
  const claims = { ...baseClaims(), exp: nowSeconds - 1 }
  assert.throws(() => validateLineIdTokenClaims(claims, { channelId, nowSeconds }))
})

test('validateLineIdTokenClaims: 空の subject を拒否する', () => {
  const claims = { ...baseClaims(), sub: '' }
  assert.throws(() => validateLineIdTokenClaims(claims, { channelId, nowSeconds }))
})
