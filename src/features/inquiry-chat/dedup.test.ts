import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeContentHash,
  selectDuplicateDocIds,
  DEFAULT_PASTE_TITLE,
  type DedupCandidate,
} from './dedup'

// --- computeContentHash ---------------------------------------------------

test('computeContentHash は同一チャンク列に対して同一ハッシュを返す', () => {
  const a = computeContentHash(['就業規則 第1条', '第2条 賃金'])
  const b = computeContentHash(['就業規則 第1条', '第2条 賃金'])
  assert.equal(a, b)
})

test('computeContentHash はチャンク内容が異なれば別ハッシュを返す', () => {
  const a = computeContentHash(['就業規則 第1条'])
  const b = computeContentHash(['就業規則 第2条'])
  assert.notEqual(a, b)
})

test('computeContentHash はチャンクの順序が異なれば別ハッシュを返す', () => {
  const a = computeContentHash(['A', 'B'])
  const b = computeContentHash(['B', 'A'])
  assert.notEqual(a, b)
})

test('computeContentHash は 64 桁の16進文字列（sha256）を返す', () => {
  const h = computeContentHash(['x'])
  assert.match(h, /^[0-9a-f]{64}$/)
})

// --- selectDuplicateDocIds ------------------------------------------------

function candidate(overrides: Partial<DedupCandidate>): DedupCandidate {
  return {
    id: 'id-x',
    status: 'ready',
    content_hash: null,
    source_kind: 'file',
    source_url: null,
    original_filename: null,
    title: 'タイトル',
    ...overrides,
  }
}

test('content_hash 一致で置換対象になる', () => {
  const existing = [candidate({ id: 'old', content_hash: 'HASH', source_kind: 'paste' })]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'HASH',
    sourceKind: 'file',
    originalFilename: 'other.pdf',
    title: '別タイトル',
  })
  assert.deepEqual(ids, ['old'])
})

test('同一 source_url なら内容が変わっても（ハッシュが違っても）置換対象になる', () => {
  const existing = [
    candidate({
      id: 'old',
      content_hash: 'OLDHASH',
      source_kind: 'url',
      source_url: 'https://example.com/rules',
    }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'NEWHASH',
    sourceKind: 'url',
    sourceUrl: 'https://example.com/rules',
    title: 'Webページ',
  })
  assert.deepEqual(ids, ['old'])
})

test('同一 original_filename なら内容が変わっても置換対象になる', () => {
  const existing = [
    candidate({
      id: 'old',
      content_hash: 'OLDHASH',
      source_kind: 'file',
      original_filename: '就業規則.pdf',
    }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'NEWHASH',
    sourceKind: 'file',
    originalFilename: '就業規則.pdf',
    title: '就業規則',
  })
  assert.deepEqual(ids, ['old'])
})

test('paste は明示タイトル一致で置換対象になる', () => {
  const existing = [
    candidate({ id: 'old', content_hash: 'OLDHASH', source_kind: 'paste', title: '育休ルール' }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'NEWHASH',
    sourceKind: 'paste',
    title: '育休ルール',
  })
  assert.deepEqual(ids, ['old'])
})

test('paste の既定タイトルは（内容が違えば）置換対象にしない', () => {
  const existing = [
    candidate({
      id: 'old',
      content_hash: 'OLDHASH',
      source_kind: 'paste',
      title: DEFAULT_PASTE_TITLE,
    }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'NEWHASH',
    sourceKind: 'paste',
    title: DEFAULT_PASTE_TITLE,
  })
  assert.deepEqual(ids, [])
})

test('status が ready でない候補は対象外', () => {
  const existing = [
    candidate({ id: 'old', status: 'failed', content_hash: 'HASH', source_kind: 'paste' }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'HASH',
    sourceKind: 'paste',
    title: 'x',
  })
  assert.deepEqual(ids, [])
})

test('自分自身（selfId）は対象外', () => {
  const existing = [candidate({ id: 'self', content_hash: 'HASH', source_kind: 'paste' })]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'self',
    contentHash: 'HASH',
    sourceKind: 'paste',
    title: 'x',
  })
  assert.deepEqual(ids, [])
})

test('別 source_kind 同士では source 識別子一致とみなさない（url と file の文字列一致など）', () => {
  const existing = [
    candidate({
      id: 'old',
      content_hash: 'OLDHASH',
      source_kind: 'file',
      original_filename: 'https://example.com/rules',
    }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'NEWHASH',
    sourceKind: 'url',
    sourceUrl: 'https://example.com/rules',
    title: 'x',
  })
  assert.deepEqual(ids, [])
})

test('複数の重複候補をすべて返す', () => {
  const existing = [
    candidate({ id: 'a', content_hash: 'HASH', source_kind: 'paste', title: 't' }),
    candidate({
      id: 'b',
      content_hash: 'OTHER',
      source_kind: 'file',
      original_filename: 'f.pdf',
    }),
  ]
  const ids = selectDuplicateDocIds(existing, {
    selfId: 'new',
    contentHash: 'HASH',
    sourceKind: 'file',
    originalFilename: 'f.pdf',
    title: 't',
  })
  assert.deepEqual(ids.sort(), ['a', 'b'])
})
