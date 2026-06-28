import assert from 'node:assert/strict'
import test from 'node:test'

import { submitConsultationSchema } from './types'

test('正常な入力はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '相談内容のテキストです',
    isAnonymous: true,
    targetType: 'hr',
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

test('targetType=manager かつ targetEmployeeId 指定時はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'interpersonal',
    body: '上司に関する相談です',
    isAnonymous: true,
    targetType: 'manager',
    targetEmployeeId: '11111111-1111-4111-8111-111111111111',
  })
  assert.equal(result.success, true)
})

test('targetType=manager だが targetEmployeeId 未指定の場合は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'interpersonal',
    body: '上司に関する相談です',
    isAnonymous: true,
    targetType: 'manager',
  })
  assert.equal(result.success, false)
})

test('targetType=hr かつ targetEmployeeId が指定されている場合は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '人事への相談です',
    isAnonymous: false,
    targetType: 'hr',
    targetEmployeeId: '11111111-1111-4111-8111-111111111111',
  })
  assert.equal(result.success, false)
})

test('targetType=hr かつ targetEmployeeId 未指定の場合はパースに成功する', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'workload',
    body: '人事への相談です',
    isAnonymous: false,
    targetType: 'hr',
  })
  assert.equal(result.success, true)
})

test('不正な targetType は拒否される', () => {
  const result = submitConsultationSchema.safeParse({
    category: 'other',
    body: '本文',
    isAnonymous: false,
    targetType: 'invalid_target',
  })
  assert.equal(result.success, false)
})
