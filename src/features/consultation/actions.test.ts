import assert from 'node:assert/strict'
import test from 'node:test'

import { submitConsultationSchema } from './actions'

test('正常な入力はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '相談内容のテキストです',
    isAnonymous: true,
  })
  assert.equal(result.success, true)
})

test('空文字のbodyは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: '',
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})

test('2000文字を超えるbodyは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: 'あ'.repeat(2001),
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})

test('不正なcategoryは拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'invalid_category',
    body: '本文',
    isAnonymous: false,
  })
  assert.equal(result.success, false)
})
