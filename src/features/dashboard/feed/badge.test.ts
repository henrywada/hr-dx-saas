import assert from 'node:assert/strict'
import test from 'node:test'
import { formatCount } from './badge'

test('0件は0件と表示する', () => {
  assert.equal(formatCount(0), '0件')
})

test('99件以下はそのまま件数を表示する', () => {
  assert.equal(formatCount(1), '1件')
  assert.equal(formatCount(99), '99件')
})

test('100件以上は99+件と表示する', () => {
  assert.equal(formatCount(100), '99+件')
  assert.equal(formatCount(1000), '99+件')
})
