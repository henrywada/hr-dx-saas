import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { rankSeoKeywords, normalizeSeoTopicKey } from './seo-keyword-rank'

describe('rankSeoKeywords', () => {
  it('出現頻度で TOP を決め、シード語は除外する', () => {
    const seedKeys = new Set([normalizeSeoTopicKey('人事')])
    const ranked = rankSeoKeywords(
      ['働き方改革', '働き方改革', '残業代', '人事', '残業代', '残業代'],
      { seedKeys, limit: 10 }
    )
    assert.equal(ranked[0].topic, '残業代')
    assert.equal(ranked[0].hitCount, 3)
    assert.equal(ranked[0].rank, 1)
    assert.equal(ranked[1].topic, '働き方改革')
    assert.ok(!ranked.some(r => r.topicKey === normalizeSeoTopicKey('人事')))
  })
})
