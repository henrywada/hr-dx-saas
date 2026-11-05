import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'
import { embedQueryText, formatVectorForPg } from '@/features/inquiry-chat/embedding'

import { INFO_BANK_MIN_SIMILARITY, INFO_BANK_TOP_K } from './constants'
import { mergeByRrf } from './merge'
import { extractQueryTerms } from './query-terms'
import { decideSearchMode } from './router'
import type { InfoBankHit, ModeUsed, SearchMode } from './types'

/** 検索の外部依存（テストでは差し替える） */
export interface SearchDeps {
  countChunks: () => Promise<number>
  textSearch: (terms: string[], limit: number) => Promise<InfoBankHit[]>
  /** score にはコサイン類似度を入れて返す */
  ragSearch: (question: string, limit: number) => Promise<InfoBankHit[]>
}

export interface SearchResult {
  hits: InfoBankHit[]
  modeUsed: ModeUsed
}

async function runText(deps: SearchDeps, question: string): Promise<InfoBankHit[]> {
  const terms = extractQueryTerms(question)
  if (terms.length === 0) return []
  return deps.textSearch(terms, INFO_BANK_TOP_K)
}

async function runRag(deps: SearchDeps, question: string): Promise<InfoBankHit[]> {
  const hits = await deps.ragSearch(question, INFO_BANK_TOP_K)
  return hits.filter(h => h.score >= INFO_BANK_MIN_SIMILARITY)
}

/**
 * 検索方式を決めて実行する。
 * - text / rag を明示した場合はその方式だけを使う（フォールバックしない）
 * - auto は資料量で最初の方式を決め、0 件なら、もう一方へ切り替えて結果を統合する（hybrid）
 */
export async function runSearch(
  deps: SearchDeps,
  input: { question: string; mode: SearchMode }
): Promise<SearchResult> {
  const { question, mode } = input

  if (mode === 'text') return { hits: await runText(deps, question), modeUsed: 'text' }
  if (mode === 'rag') return { hits: await runRag(deps, question), modeUsed: 'rag' }

  const first = decideSearchMode({ requested: 'auto', currentChunkCount: await deps.countChunks() })
  const primary = first === 'text' ? runText : runRag
  const secondary = first === 'text' ? runRag : runText

  let primaryHits: InfoBankHit[] = []
  try {
    primaryHits = await primary(deps, question)
  } catch (e) {
    console.error('[info-bank] primary search failed', e instanceof Error ? e.message : e)
  }
  if (primaryHits.length > 0) return { hits: primaryHits, modeUsed: first }

  let secondaryHits: InfoBankHit[] = []
  try {
    secondaryHits = await secondary(deps, question)
  } catch (e) {
    console.error('[info-bank] secondary search failed', e instanceof Error ? e.message : e)
  }
  const merged =
    first === 'text'
      ? mergeByRrf(primaryHits, secondaryHits)
      : mergeByRrf(secondaryHits, primaryHits)
  return { hits: merged, modeUsed: 'hybrid' }
}

/** ユーザー権限（RLS 有効）の Supabase クライアントで検索する実装 */
export function createSearchDeps(supabase: SupabaseClient<Database>): SearchDeps {
  return {
    countChunks: async () => {
      const { data, error } = await supabase.rpc('count_info_bank_chunks')
      if (error) throw new Error(error.message)
      return data ?? 0
    },
    textSearch: async (terms, limit) => {
      const { data, error } = await supabase.rpc('search_info_bank_text', {
        p_terms: terms,
        p_limit: limit,
      })
      if (error) throw new Error(error.message)
      return (data ?? []).map(r => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        title: r.title,
        content: r.content,
        score: r.score,
        via: 'text' as const,
      }))
    },
    ragSearch: async (question, limit) => {
      const embedding = await embedQueryText(question)
      const { data, error } = await supabase.rpc('match_info_bank_chunks', {
        query_embedding: formatVectorForPg(embedding),
        match_count: limit,
      })
      if (error) throw new Error(error.message)
      return (data ?? []).map(r => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        title: r.title,
        content: r.content,
        score: r.similarity,
        via: 'rag' as const,
      }))
    },
  }
}
