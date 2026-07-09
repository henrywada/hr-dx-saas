import type { Citation } from './types'

/** match_hr_law_chunks RPC の戻り値の1行 */
export type LawChunkRow = {
  id: string
  document_id: string
  content: string
  metadata: {
    document_title?: string
    source_url?: string
    fetched_at?: string
  }
  similarity: number
}

/** 取得日時（ISO8601）を YYYY-MM-DD に整形する */
function toDateOnly(iso: string | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/**
 * 法令チャンクをプロンプトへ渡すコンテキストブロックに整形する。
 * 出典URL・取得日を明記し、社内資料と区別できるようにする。
 */
export function formatLawContextBlocks(rows: LawChunkRow[]): string[] {
  return rows.map((r, i) => {
    const title = r.metadata?.document_title || '法令文書'
    const sourceUrl = r.metadata?.source_url || ''
    const fetchedAt = toDateOnly(r.metadata?.fetched_at)
    return `【法令情報${i + 1}: ${title}（取得日: ${fetchedAt}、出典: ${sourceUrl}）】\n${r.content}`
  })
}

/** 法令チャンクを引用表示用の Citation 配列に整形する（最大5件） */
export function formatLawCitations(rows: LawChunkRow[]): Citation[] {
  return rows.slice(0, 5).map(r => ({
    title: r.metadata?.document_title || '法令文書',
    snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
    sourceUrl: r.metadata?.source_url,
    fetchedAt: toDateOnly(r.metadata?.fetched_at),
  }))
}
