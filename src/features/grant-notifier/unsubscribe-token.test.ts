import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from '@/features/grant-notifier/unsubscribe-token'

const SECRET = 'test-unsubscribe-secret'
const TENANT_ID = '11111111-2222-3333-4444-555555555555'

test('発行したトークンから tenant_id とメールアドレスを復元できる', () => {
  const token = createUnsubscribeToken(TENANT_ID, 'hr@example.com', SECRET)

  assert.deepEqual(verifyUnsubscribeToken(token, SECRET), {
    tenantId: TENANT_ID,
    email: 'hr@example.com',
  })
})

test('メールアドレスにコロンが含まれても正しく分割できる', () => {
  const email = 'weird:address@example.com'
  const token = createUnsubscribeToken(TENANT_ID, email, SECRET)

  assert.deepEqual(verifyUnsubscribeToken(token, SECRET), {
    tenantId: TENANT_ID,
    email,
  })
})

test('署名が改ざんされたトークンは null を返す', () => {
  const token = createUnsubscribeToken(TENANT_ID, 'hr@example.com', SECRET)
  const [payload] = token.split('.')
  const forged = `${payload}.${'A'.repeat(43)}`

  assert.equal(verifyUnsubscribeToken(forged, SECRET), null)
})

test('ペイロードが差し替えられたトークンは null を返す', () => {
  const token = createUnsubscribeToken(TENANT_ID, 'hr@example.com', SECRET)
  const [, sig] = token.split('.')
  const otherPayload = Buffer.from(`${TENANT_ID}:attacker@example.com`).toString('base64url')

  assert.equal(verifyUnsubscribeToken(`${otherPayload}.${sig}`, SECRET), null)
})

test('別の秘密鍵で検証すると null を返す', () => {
  const token = createUnsubscribeToken(TENANT_ID, 'hr@example.com', SECRET)

  assert.equal(verifyUnsubscribeToken(token, 'another-secret'), null)
})

test('形式が不正なトークンは null を返す', () => {
  assert.equal(verifyUnsubscribeToken('', SECRET), null)
  assert.equal(verifyUnsubscribeToken('no-separator', SECRET), null)
  assert.equal(verifyUnsubscribeToken('a.b.c', SECRET), null)
})
