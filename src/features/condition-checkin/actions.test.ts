import assert from 'node:assert/strict'
import test from 'node:test'

import { submitConditionCheckinSchema } from './types'

test('正常な入力（memoなし）はパースに成功する', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 3 })
  assert.equal(result.success, true)
})

test('正常な入力（memoあり）はパースに成功する', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 5, memo: '今日は調子が良い' })
  assert.equal(result.success, true)
})

test('score=0は拒否される', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 0 })
  assert.equal(result.success, false)
})

test('score=6は拒否される', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 6 })
  assert.equal(result.success, false)
})

test('非整数のscoreは拒否される', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 3.5 })
  assert.equal(result.success, false)
})

test('memoが200文字なら受理される', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 3, memo: 'あ'.repeat(200) })
  assert.equal(result.success, true)
})

test('memoが201文字なら拒否される', () => {
  const result = submitConditionCheckinSchema.safeParse({ score: 3, memo: 'あ'.repeat(201) })
  assert.equal(result.success, false)
})
