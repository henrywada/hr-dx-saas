import assert from 'node:assert/strict'
import test from 'node:test'

import { createKudosSchema, toggleReactionSchema } from './types'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

test('正常なKudos投稿入力はパースに成功する', () => {
  const result = createKudosSchema.safeParse({
    recipientEmployeeIds: [VALID_UUID],
    message: 'いつもありがとうございます！',
    valueTag: 'チームワーク',
  })
  assert.equal(result.success, true)
})

test('バリュータグなしでもパースに成功する', () => {
  const result = createKudosSchema.safeParse({
    recipientEmployeeIds: [VALID_UUID],
    message: 'ナイスサポートでした',
  })
  assert.equal(result.success, true)
})

test('宛先が0件は拒否される', () => {
  const result = createKudosSchema.safeParse({
    recipientEmployeeIds: [],
    message: 'ありがとうございます',
  })
  assert.equal(result.success, false)
})

test('メッセージが空文字は拒否される', () => {
  const result = createKudosSchema.safeParse({
    recipientEmployeeIds: [VALID_UUID],
    message: '',
  })
  assert.equal(result.success, false)
})

test('宛先が複数名でもパースに成功する', () => {
  const result = createKudosSchema.safeParse({
    recipientEmployeeIds: [VALID_UUID, '22222222-2222-4222-8222-222222222222'],
    message: 'チーム一同、本当に助かりました',
  })
  assert.equal(result.success, true)
})

test('正常なリアクション入力はパースに成功する', () => {
  const result = toggleReactionSchema.safeParse({ kudosId: VALID_UUID })
  assert.equal(result.success, true)
})

test('リアクション: kudosIdがUUID形式でない場合は拒否される', () => {
  const result = toggleReactionSchema.safeParse({ kudosId: 'not-a-uuid' })
  assert.equal(result.success, false)
})
