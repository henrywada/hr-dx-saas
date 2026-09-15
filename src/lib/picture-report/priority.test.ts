import assert from 'node:assert/strict'
import test from 'node:test'
import { isPicturePriority, picturePriorityLabel, DEFAULT_PICTURE_PRIORITY } from './priority'

test('high/medium/lowはPicturePriorityと判定される', () => {
  assert.equal(isPicturePriority('high'), true)
  assert.equal(isPicturePriority('medium'), true)
  assert.equal(isPicturePriority('low'), true)
})

test('不正な値はPicturePriorityと判定されない', () => {
  assert.equal(isPicturePriority('urgent'), false)
  assert.equal(isPicturePriority(123), false)
  assert.equal(isPicturePriority(null), false)
})

test('高はラベル「高」に変換される', () => {
  assert.equal(picturePriorityLabel('high'), '高')
})

test('不正な値はデフォルト優先度のラベルにフォールバックする', () => {
  assert.equal(picturePriorityLabel('unknown'), picturePriorityLabel(DEFAULT_PICTURE_PRIORITY))
})
