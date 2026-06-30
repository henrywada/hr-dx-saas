import assert from 'node:assert/strict'
import test from 'node:test'

import { createEventSchema, updateEventSchema, deleteEventSchema, updateRsvpSchema, createAwardSchema } from './types'

test('正常なイベント入力はパースに成功する', () => {
  const result = createEventSchema.safeParse({
    title: '懇親会',
    description: '今期の振り返り懇親会です',
    event_date: '2026-07-10T18:00:00+09:00',
    location: '本社会議室',
    audience_type: 'tenant',
  })
  assert.equal(result.success, true)
})

test('部署限定イベントは division_id 必須', () => {
  const result = createEventSchema.safeParse({
    title: '【営業部】懇親会',
    event_date: '2026-07-10T18:00:00+09:00',
    audience_type: 'division',
  })
  assert.equal(result.success, false)
})

test('部署限定イベントは division_id 付きでパース成功', () => {
  const result = createEventSchema.safeParse({
    title: '【営業部】懇親会',
    event_date: '2026-07-10T18:00:00+09:00',
    audience_type: 'division',
    division_id: '11111111-1111-4111-8111-111111111111',
  })
  assert.equal(result.success, true)
})

test('タイトル空文字は拒否される', () => {
  const result = createEventSchema.safeParse({
    title: '',
    event_date: '2026-07-10T18:00:00+09:00',
  })
  assert.equal(result.success, false)
})

test('開催日時が空文字は拒否される', () => {
  const result = createEventSchema.safeParse({
    title: '懇親会',
    event_date: '',
  })
  assert.equal(result.success, false)
})

test('イベント更新: id が UUID 形式でない場合は拒否される', () => {
  const result = updateEventSchema.safeParse({
    id: 'not-a-uuid',
    title: '懇親会',
    event_date: '2026-07-10T18:00:00+09:00',
  })
  assert.equal(result.success, false)
})

test('イベント削除: 正常な id はパースに成功する', () => {
  const result = deleteEventSchema.safeParse({
    id: '11111111-1111-4111-8111-111111111111',
  })
  assert.equal(result.success, true)
})

test('RSVPステータスはenum範囲外を拒否する', () => {
  const result = updateRsvpSchema.safeParse({
    eventId: '11111111-1111-4111-8111-111111111111',
    rsvpStatus: 'maybe',
  })
  assert.equal(result.success, false)
})

test('正常なRSVP入力はパースに成功する', () => {
  const result = updateRsvpSchema.safeParse({
    eventId: '11111111-1111-4111-8111-111111111111',
    rsvpStatus: 'attending',
  })
  assert.equal(result.success, true)
})

test('正常な表彰登録入力はパースに成功する', () => {
  const result = createAwardSchema.safeParse({
    recipientEmployeeId: '11111111-1111-4111-8111-111111111111',
    awardType: '月間MVP',
    periodLabel: '2026-06',
    comment: '営業目標を大幅に達成しました',
    publishAnnouncement: true,
  })
  assert.equal(result.success, true)
})

test('表彰登録: 対象期間が空文字は拒否される', () => {
  const result = createAwardSchema.safeParse({
    recipientEmployeeId: '11111111-1111-4111-8111-111111111111',
    awardType: '月間MVP',
    periodLabel: '',
  })
  assert.equal(result.success, false)
})

test('表彰登録: recipientEmployeeIdがUUID形式でない場合は拒否される', () => {
  const result = createAwardSchema.safeParse({
    recipientEmployeeId: 'not-a-uuid',
    awardType: '月間MVP',
    periodLabel: '2026-06',
  })
  assert.equal(result.success, false)
})
