import assert from 'node:assert/strict'
import test from 'node:test'

import { truncateAiAdvice } from './actions'

test('25文字以内のタイトルはそのまま', () => {
  const result = truncateAiAdvice({ title: 'あ'.repeat(25), description: 'd' })
  assert.equal(result.title.length, 25)
})

test('25文字を超えるタイトルは切り詰められる', () => {
  const result = truncateAiAdvice({ title: 'あ'.repeat(30), description: 'd' })
  assert.equal(result.title.length, 25)
})

test('100文字を超える description は切り詰められる', () => {
  const result = truncateAiAdvice({ title: 't', description: 'い'.repeat(120) })
  assert.equal(result.description.length, 100)
})
