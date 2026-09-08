import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateAverageProgress, groupProgressByParent } from './progress'

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

test('groupProgressByParent: 複数の親にバケット分けしてフラット平均する', () => {
  // マイルストーンA: [20, 60] → 40、マイルストーンB: [100] → 100
  const rows = [
    { value: 20, parentId: 'A' },
    { value: 60, parentId: 'A' },
    { value: 100, parentId: 'B' },
  ]
  assert.deepEqual(groupProgressByParent(rows, ['A', 'B']), { A: 40, B: 100 })
})

test('groupProgressByParent: 該当する行が無い親は0になる', () => {
  const rows = [{ value: 50, parentId: 'A' }]
  assert.deepEqual(groupProgressByParent(rows, ['A', 'B']), { A: 50, B: 0 })
})

test('groupProgressByParent: 行が空なら全ての親が0になる', () => {
  assert.deepEqual(groupProgressByParent([], ['A', 'B']), { A: 0, B: 0 })
})
