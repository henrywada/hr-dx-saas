import { INFO_BANK_RAG_THRESHOLD_CHUNKS } from './constants'
import type { SearchMode } from './types'

/**
 * 最初に試す検索方式を決める。
 * 明示指定（text / rag）は件数に関わらず尊重し、auto は有効チャンク数で切り替える。
 * 0 件・低類似度のときのフォールバックは search.ts 側で行う。
 */
export function decideSearchMode(input: {
  requested: SearchMode
  currentChunkCount: number
}): 'text' | 'rag' {
  if (input.requested === 'text' || input.requested === 'rag') return input.requested
  return input.currentChunkCount < INFO_BANK_RAG_THRESHOLD_CHUNKS ? 'text' : 'rag'
}
