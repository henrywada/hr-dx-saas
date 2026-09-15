import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSubjectSchema,
  sendPictureSchema,
  updateSendBodySchema,
  deleteSendSchema,
} from './types'

test('件名ラベルが空文字なら拒否される', () => {
  const result = createSubjectSchema.safeParse({ label: '' })
  assert.equal(result.success, false)
})

test('件名ラベルが有効なら成功する', () => {
  const result = createSubjectSchema.safeParse({ label: '日報' })
  assert.equal(result.success, true)
})

test('sendPictureSchema: subjectTextが空だと拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '',
    bodyText: '本文',
    priority: 'medium',
  })
  assert.equal(result.success, false)
})

test('sendPictureSchema: 不正なpriorityは拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: '',
    priority: 'urgent',
  })
  assert.equal(result.success, false)
})

test('sendPictureSchema: 正常な入力は成功する', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: '11111111-1111-4111-8111-111111111111',
    subjectText: '日報',
    bodyText: '本日の状況です',
    priority: 'high',
  })
  assert.equal(result.success, true)
})

test('updateSendBodySchema: idがUUID形式でない場合は拒否される', () => {
  const result = updateSendBodySchema.safeParse({ id: 'not-a-uuid', bodyText: '更新' })
  assert.equal(result.success, false)
})

test('deleteSendSchema: 正常なidは成功する', () => {
  const result = deleteSendSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111' })
  assert.equal(result.success, true)
})
