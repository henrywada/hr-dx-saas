import assert from 'node:assert/strict'
import test from 'node:test'

import { MHLW_57_SCALES, toEvalPoint } from './mhlw-scales'

test('素点換算表は取りうる全得点を重複なく1列に割り当てる（男女とも）', () => {
  for (const scale of MHLW_57_SCALES) {
    const scores = [1, 4].map(answer => scale.score(() => answer))
    const [min, max] = [Math.min(...scores), Math.max(...scores)]
    for (const gender of ['male', 'female'] as const) {
      for (let s = min; s <= max; s++) {
        const hits = scale.bands[gender].filter(b => b !== null && s >= b[0] && s <= b[1])
        assert.equal(hits.length, 1, `${scale.name}(${gender}) 得点${s} の該当列数が ${hits.length}`)
        assert.notEqual(toEvalPoint(scale, s, gender), null)
      }
    }
  }
})

test('57項目すべてがいずれか1つの尺度に属する', () => {
  const expected = { A: 17, B: 29, C: 9, D: 2 }
  for (const [category, count] of Object.entries(expected)) {
    const items = MHLW_57_SCALES.filter(s => s.category === category).flatMap(s => s.items)
    assert.deepEqual([...items].sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i + 1))
  }
})
