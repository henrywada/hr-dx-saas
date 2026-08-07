import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildNormalizedKey,
  computeBodyHash,
  htmlToText,
  normalizeWhitespace,
} from '@/features/grant-notifier/batch/collect/normalize'

test('normalizeWhitespace は連続する空白を1つに畳んで trim する', () => {
  assert.equal(normalizeWhitespace('  a\n\n  b\t c  '), 'a b c')
})

test('htmlToText は HTML からテキストを抽出して空白を正規化する', () => {
  assert.equal(
    htmlToText('<div>■目的・概要<br>\n  産業競争力の強化</div>'),
    '■目的・概要 産業競争力の強化'
  )
})

test('htmlToText は空文字・空白のみの HTML に空文字を返す', () => {
  assert.equal(htmlToText('   '), '')
})

test('computeBodyHash は空白の違いを無視して同じハッシュを返す', () => {
  assert.equal(computeBodyHash('a b'), computeBodyHash('  a   b  '))
})

test('computeBodyHash は内容が違えば異なるハッシュを返す', () => {
  assert.notEqual(computeBodyHash('申請締切 6月'), computeBodyHash('申請締切 8月'))
})

test('computeBodyHash は 64 桁の16進数を返す', () => {
  assert.match(computeBodyHash('x'), /^[0-9a-f]{64}$/)
})

test('buildNormalizedKey は URL の末尾スラッシュ・大文字小文字の揺れを吸収する', () => {
  const a = buildNormalizedKey('https://www.jgrants-portal.go.jp/subsidy/A1/', '  助成金 X ')
  const b = buildNormalizedKey('https://www.jgrants-portal.go.jp/subsidy/a1', '助成金 X')

  assert.equal(a, b)
})

test('buildNormalizedKey は別の助成金には別のキーを返す', () => {
  assert.notEqual(
    buildNormalizedKey('https://example.com/a', '助成金A'),
    buildNormalizedKey('https://example.com/b', '助成金B')
  )
})
