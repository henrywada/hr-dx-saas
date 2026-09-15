import assert from 'node:assert/strict'
import test from 'node:test'
import { parseWebhookEvents } from './parseWebhookEvents'

test('parseWebhookEvents: follow イベントをパースする', () => {
  const body = {
    events: [{ type: 'follow', replyToken: 'reply-1', source: { userId: 'U1' } }],
  }
  assert.deepEqual(parseWebhookEvents(body), [
    { type: 'follow', replyToken: 'reply-1', source: { userId: 'U1' } },
  ])
})

test('parseWebhookEvents: unfollow イベントをパースする', () => {
  const body = { events: [{ type: 'unfollow', source: { userId: 'U2' } }] }
  assert.deepEqual(parseWebhookEvents(body), [{ type: 'unfollow', source: { userId: 'U2' } }])
})

test('parseWebhookEvents: 未知のイベント種別は捨てる', () => {
  const body = {
    events: [
      { type: 'postback', source: { userId: 'U3' } },
      { type: 'follow', replyToken: 'reply-2', source: { userId: 'U4' } },
    ],
  }
  assert.deepEqual(parseWebhookEvents(body), [
    { type: 'follow', replyToken: 'reply-2', source: { userId: 'U4' } },
  ])
})

test('parseWebhookEvents: 必須フィールド欠落のイベントは捨てる', () => {
  const body = { events: [{ type: 'follow', source: { userId: 'U5' } }] }
  assert.deepEqual(parseWebhookEvents(body), [])
})

test('parseWebhookEvents: events 配列が無い body は例外', () => {
  assert.throws(() => parseWebhookEvents({}))
})
