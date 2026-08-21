import assert from 'node:assert/strict'
import test from 'node:test'
import { toConsultationFeedItems } from './feed-provider'

const NOW = '2026-08-21T00:00:00.000Z'

test('件数0のときは何も返さない', () => {
  assert.deepEqual(toConsultationFeedItems(0, 'employee', NOW), [])
})

test('相談対応スタッフ役割は管理キューへのリンクになる', () => {
  const items = toConsultationFeedItems(3, 'hr', NOW)
  assert.equal(items.length, 1)
  assert.equal(items[0].href, '/adm/consultation-queue')
  assert.equal(items[0].severity, 'warning')
  assert.equal(items[0].dedupeKey, 'consultation:pending')
})

test('相談対応スタッフ以外（上司等）は自分の受信箱へのリンクになる', () => {
  const items = toConsultationFeedItems(3, 'employee', NOW)
  assert.equal(items[0].href, '/consultation/inbox')
})

test('appRole が未設定でも受信箱リンクにフォールバックする', () => {
  const items = toConsultationFeedItems(1, null, NOW)
  assert.equal(items[0].href, '/consultation/inbox')
})
