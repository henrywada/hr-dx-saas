import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { verifyLineWebhookSignature } from './verifyWebhookSignature'

const channelSecret = 'test-channel-secret'
const rawBody = '{"events":[]}'

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64')
}

test('verifyLineWebhookSignature: 正しい署名は true', () => {
  const signature = sign(rawBody, channelSecret)
  assert.equal(
    verifyLineWebhookSignature({ rawBody, signatureHeader: signature, channelSecret }),
    true
  )
})

test('verifyLineWebhookSignature: 秘密が違うと false', () => {
  const signature = sign(rawBody, 'wrong-secret')
  assert.equal(
    verifyLineWebhookSignature({ rawBody, signatureHeader: signature, channelSecret }),
    false
  )
})

test('verifyLineWebhookSignature: ヘッダー無しは false', () => {
  assert.equal(verifyLineWebhookSignature({ rawBody, signatureHeader: null, channelSecret }), false)
})

test('verifyLineWebhookSignature: body 改ざんは false', () => {
  const signature = sign(rawBody, channelSecret)
  assert.equal(
    verifyLineWebhookSignature({
      rawBody: '{"events":[{"type":"follow"}]}',
      signatureHeader: signature,
      channelSecret,
    }),
    false
  )
})
