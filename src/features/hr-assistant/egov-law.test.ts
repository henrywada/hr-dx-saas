import assert from 'node:assert/strict'
import test from 'node:test'

import { formatArticleLabel } from './egov-law'

test('formatArticleLabel: 通常の条番号のみ', () => {
  assert.equal(formatArticleLabel('32'), '第32条')
})

test('formatArticleLabel: 枝番号は「条の」の順で表示する', () => {
  assert.equal(formatArticleLabel('9_2'), '第9条の2')
})

test('formatArticleLabel: 項・号を付加する', () => {
  assert.equal(formatArticleLabel('36', 1, 2), '第36条第1項第2号')
})

test('formatArticleLabel: 枝番号+項も正しい順序になる', () => {
  assert.equal(formatArticleLabel('9_2', 3), '第9条の2第3項')
})

test('formatArticleLabel: 多段の枝番号も全て表示する', () => {
  assert.equal(formatArticleLabel('24_2_3'), '第24条の2の3')
})
