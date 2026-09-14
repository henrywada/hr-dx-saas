import assert from 'node:assert/strict'
import test from 'node:test'

import { mapNotionPage, normalizeRichText, stripUnsafeHtml } from './map-page'

function textProp(content: string) {
  return { type: 'rich_text', rich_text: [{ plain_text: content }] }
}

function titleProp(content: string) {
  return { type: 'title', title: [{ plain_text: content }] }
}

function dateProp(start: string | null) {
  return { type: 'date', date: start ? { start } : null }
}

function urlProp(url: string | null) {
  return { type: 'url', url }
}

test('タイトルはタイトルプロパティを優先し、無ければ title プロパティを使う', () => {
  const withTitle = mapNotionPage({
    id: 'p1',
    properties: {
      タイトル: textProp('助成金A'),
      Status: titleProp('進行中'),
    },
  })
  assert.equal(withTitle.title, '助成金A')

  const trend = mapNotionPage({
    id: 'p2',
    properties: {
      名前: titleProp('労働法改正'),
    },
  })
  assert.equal(trend.title, '労働法改正')
})

test('収集日時・募集期限は date.start の日付部分を取る', () => {
  const item = mapNotionPage({
    id: 'p3',
    properties: {
      名前: titleProp('x'),
      収集日時: dateProp('2026-08-01T10:00:00.000+09:00'),
      募集期限: dateProp('2026-09-30'),
      募集開始日: dateProp('2026-04-01'),
    },
  })
  assert.equal(item.collectedAt, '2026-08-01T10:00:00.000+09:00')
  assert.equal(item.deadline, '2026-09-30')
  assert.equal(item.openDate, '2026-04-01')
})

test('URL は url 型でも rich_text でも取る', () => {
  const a = mapNotionPage({
    id: 'p4',
    properties: { 名前: titleProp('x'), URL: urlProp('https://example.com/a') },
  })
  assert.equal(a.url, 'https://example.com/a')

  const b = mapNotionPage({
    id: 'p5',
    properties: { 名前: titleProp('x'), URL: textProp('https://example.com/b') },
  })
  assert.equal(b.url, 'https://example.com/b')
})

test('本文の br を改行にし、残りのタグを除去する', () => {
  assert.equal(stripUnsafeHtml('A<br>B<br/>C'), 'A\nB\nC')
  assert.equal(stripUnsafeHtml('<p onclick="alert(1)">x</p>'), 'x')
})

test('rich_text の plain_text を連結する', () => {
  assert.equal(
    normalizeRichText({
      type: 'rich_text',
      rich_text: [{ plain_text: 'あ' }, { plain_text: 'い' }],
    }),
    'あい'
  )
})

test('要約と本文プロパティから summary と body を取る', () => {
  const item = mapNotionPage({
    id: 'p6',
    properties: {
      名前: titleProp('助成金B'),
      要約: textProp('概要テキスト'),
      本文: textProp('本文1<br/>本文2<p>段落</p>'),
    },
  })
  assert.equal(item.summary, '概要テキスト')
  assert.equal(item.body, '本文1\n本文2段落')
})

test('本文が空ならページの本文（詳細）を使う', () => {
  const item = mapNotionPage({
    id: 'p7',
    properties: {
      名前: titleProp('助成金C'),
      'ページの本文（詳細）': textProp('旧列の本文'),
    },
  })
  assert.equal(item.body, '旧列の本文')
})
