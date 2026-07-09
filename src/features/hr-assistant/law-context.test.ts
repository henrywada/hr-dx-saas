import assert from 'node:assert/strict'
import test from 'node:test'

import { formatLawContextBlocks, formatLawCitations } from './law-context'
import type { LawChunkRow } from './law-context'

function makeRow(overrides: Partial<LawChunkRow>): LawChunkRow {
  return {
    id: 'chunk-1',
    document_id: 'doc-1',
    content: '最低賃金は毎年10月に改定されます。',
    metadata: {
      document_title: '令和8年度地域別最低賃金改定状況',
      source_url: 'https://www.mhlw.go.jp/example',
      fetched_at: '2026-07-01T00:00:00Z',
    },
    similarity: 0.9,
    ...overrides,
  }
}

test('法令情報として出典URLと取得日を含むコンテキストブロックを生成する', () => {
  const rows = [makeRow({})]
  const blocks = formatLawContextBlocks(rows)
  assert.equal(blocks.length, 1)
  assert.match(blocks[0], /法令情報1/)
  assert.match(blocks[0], /令和8年度地域別最低賃金改定状況/)
  assert.match(blocks[0], /取得日: 2026-07-01/)
  assert.match(blocks[0], /https:\/\/www\.mhlw\.go\.jp\/example/)
  assert.match(blocks[0], /最低賃金は毎年10月に改定されます。/)
})

test('複数行は連番になる', () => {
  const rows = [
    makeRow({ id: 'c1' }),
    makeRow({
      id: 'c2',
      metadata: {
        document_title: '別の文書',
        source_url: 'https://mhlw.go.jp/b',
        fetched_at: '2026-06-01T00:00:00Z',
      },
    }),
  ]
  const blocks = formatLawContextBlocks(rows)
  assert.match(blocks[0], /法令情報1/)
  assert.match(blocks[1], /法令情報2/)
})

test('空配列なら空配列を返す', () => {
  assert.deepEqual(formatLawContextBlocks([]), [])
})

test('metadata の document_title が無い場合は「法令文書」で代替する', () => {
  const rows = [
    makeRow({
      metadata: { source_url: 'https://mhlw.go.jp/x', fetched_at: '2026-07-01T00:00:00Z' },
    }),
  ]
  const blocks = formatLawContextBlocks(rows)
  assert.match(blocks[0], /法令文書/)
})

test('formatLawCitations は最大5件・出典URL/取得日つきで返す', () => {
  const rows = Array.from({ length: 8 }, (_, i) =>
    makeRow({
      id: `c${i}`,
      metadata: {
        document_title: `文書${i}`,
        source_url: `https://mhlw.go.jp/${i}`,
        fetched_at: '2026-07-01T00:00:00Z',
      },
    })
  )
  const citations = formatLawCitations(rows)
  assert.equal(citations.length, 5)
  assert.equal(citations[0].title, '文書0')
  assert.equal(citations[0].sourceUrl, 'https://mhlw.go.jp/0')
  assert.equal(citations[0].fetchedAt, '2026-07-01')
  assert.ok(citations[0].snippet.length > 0)
})
