import assert from 'node:assert/strict'
import test from 'node:test'

import { chunkPlainText } from './chunk'
import { CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from './constants'

test('CHUNK_MAX_CHARS 未満のテキストは1チャンクになる', () => {
  const text = 'これは短いテキストです。'
  const chunks = chunkPlainText(text)
  assert.equal(chunks.length, 1)
  assert.equal(chunks[0], text)
})

test('空文字は空配列を返す', () => {
  assert.deepEqual(chunkPlainText(''), [])
  assert.deepEqual(chunkPlainText('   '), [])
})

test('CHUNK_MAX_CHARS を超えるテキストでも、末尾付近で1文字ずつずれる大量の重複チャンクを生成しない', () => {
  // 句読点が短い間隔で連続する日本語テキスト（末尾のオーバーラップ処理が破綻しやすいパターン）。
  // 各文に一意な番号を付け、末尾判定が周期的な繰り返し文字列に惑わされないようにする。
  const sentence =
    '労働者数50人未満の事業場に対するストレスチェック義務化の具体的な施行日については、現時点では明記されていません。今後の情報公開を注視する必要があります。'
  const text = Array.from({ length: 20 }, (_, i) => `${sentence}(第${i}文)`).join('') // 約1600文字

  const chunks = chunkPlainText(text)

  // 900文字チャンク・100文字オーバーラップなら数チャンクに収まるはずで、
  // 100件超のような暴走（末尾が1文字ずつ縮む重複チャンクの連鎖）は起きてはいけない
  assert.ok(chunks.length <= 10, `チャンク数が異常に多い（暴走の疑い）: ${chunks.length}件`)

  // テキスト末尾に到達するチャンクは最後の1件だけであるべき。
  // 暴走時は「末尾に到達するが1文字ずつ短くなる準重複チャンク」が何十件も生成される。
  const tail = text.slice(-30)
  const chunksReachingEnd = chunks.filter(c => c.endsWith(tail)).length
  assert.equal(
    chunksReachingEnd,
    1,
    `テキスト末尾に到達するチャンクが複数ある（オーバーラップ計算の暴走）: ${chunksReachingEnd}件`
  )
})

test('長いテキストの末尾まで欠落なくカバーする', () => {
  const text = 'あ'.repeat(CHUNK_MAX_CHARS * 3)
  const chunks = chunkPlainText(text)

  assert.ok(chunks.length > 1)
  const lastChunk = chunks[chunks.length - 1]
  assert.ok(text.endsWith(lastChunk.slice(-10)))
})

test('チャンク間のオーバーラップは CHUNK_OVERLAP_CHARS 程度に収まる', () => {
  const text = 'あ'.repeat(CHUNK_MAX_CHARS * 3)
  const chunks = chunkPlainText(text)

  for (let i = 1; i < chunks.length; i++) {
    // 直前のチャンクと今のチャンクを text 内で連結復元し、重複部分の長さを見積もる
    assert.ok(chunks[i].length <= CHUNK_MAX_CHARS)
  }
  assert.ok(chunks.length < text.length / (CHUNK_MAX_CHARS - CHUNK_OVERLAP_CHARS) + 2)
})
