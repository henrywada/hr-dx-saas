import { INFO_BANK_TOP_K } from './constants'
import type { InfoBankHit } from './types'

const DEFAULT_RRF_K = 60

/**
 * テキスト検索と RAG 検索の結果を Reciprocal Rank Fusion で統合する。
 * 両方に現れたチャンクは via='both' にまとめ、score には RRF スコアを入れる。
 */
export function mergeByRrf(
  textHits: readonly InfoBankHit[],
  ragHits: readonly InfoBankHit[],
  k: number = DEFAULT_RRF_K,
  limit: number = INFO_BANK_TOP_K
): InfoBankHit[] {
  const merged = new Map<string, InfoBankHit>()

  const accumulate = (hits: readonly InfoBankHit[], via: 'text' | 'rag') => {
    hits.forEach((hit, rank) => {
      const rrf = 1 / (k + rank + 1)
      const prev = merged.get(hit.chunkId)
      merged.set(
        hit.chunkId,
        prev ? { ...prev, score: prev.score + rrf, via: 'both' } : { ...hit, score: rrf, via }
      )
    })
  }
  accumulate(textHits, 'text')
  accumulate(ragHits, 'rag')

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}
