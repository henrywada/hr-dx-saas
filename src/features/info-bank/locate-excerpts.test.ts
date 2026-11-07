import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { locateExcerpts, normalizeForMatch } from './locate-excerpts'

describe('locateExcerpts', () => {
  const text = 'AAA。BBB。CCC。DDD。EEE。FFF。'

  it('抜粋の位置を返す', () => {
    assert.deepEqual(locateExcerpts(text, ['BBB。']), [{ start: 4, end: 8 }])
  })

  it('見つからない抜粋と空の抜粋は無視する', () => {
    assert.deepEqual(locateExcerpts(text, ['ZZZ', '  ']), [])
  })

  it('重なる範囲は 1 つにまとめ、位置順に返す', () => {
    const ranges = locateExcerpts(text, ['CCC。DDD。', 'BBB。CCC。', 'FFF。'])
    assert.deepEqual(ranges, [
      { start: 4, end: 16 },
      { start: 20, end: 24 },
    ])
  })

  it('前後の空白を除いて照合する', () => {
    assert.deepEqual(locateExcerpts(text, ['\n BBB。 ']), [{ start: 4, end: 8 }])
  })
})

describe('normalizeForMatch', () => {
  it('CRLF を LF に、NBSP を空白にそろえる', () => {
    assert.equal(normalizeForMatch('a\r\nb c'), 'a\nb c')
  })
})
