import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateAverageProgress } from './progress'

test('空配列なら0を返す', () => {
  assert.equal(calculateAverageProgress([]), 0)
})

test('単一要素はその値を返す', () => {
  assert.equal(calculateAverageProgress([40]), 40)
})

test('複数要素は平均値を四捨五入して返す', () => {
  assert.equal(calculateAverageProgress([0, 50, 100]), 50)
})

test('割り切れない平均は四捨五入する', () => {
  assert.equal(calculateAverageProgress([1, 2]), 2)
})
