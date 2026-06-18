import { getGeminiClient } from '@/lib/ai/gemini'
import { CHUNK_MAX_CHARS, EMBEDDING_DIMENSION, EMBEDDING_MODEL } from './constants'

/** Supabase / pgvector へ渡す文字列形式 */
export function formatVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}

/**
 * テキストの埋め込みベクトルを取得（長文は先頭のみ — クエリ用）
 * 検索クエリ用途のため taskType は RETRIEVAL_QUERY を指定する。
 */
export async function embedQueryText(text: string): Promise<number[]> {
  const trimmed = text.slice(0, CHUNK_MAX_CHARS * 2)
  const ai = getGeminiClient()
  const res = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: trimmed,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
      taskType: 'RETRIEVAL_QUERY',
    },
  })
  const v = res.embeddings?.[0]?.values
  if (!v) throw new Error('埋め込みが空です')
  return v
}

const BATCH = 64

/**
 * 複数チャンクの埋め込みを取得（取り込み用）。
 * 文書登録用途のため taskType は RETRIEVAL_DOCUMENT を指定する。
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const ai = getGeminiClient()
  const out: number[][] = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: {
        outputDimensionality: EMBEDDING_DIMENSION,
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    })
    const embeddings = res.embeddings
    if (!embeddings || embeddings.length !== batch.length) {
      throw new Error('埋め込みバッチの件数が一致しません')
    }
    // embedContent は contents の順序を保持して返す
    for (const row of embeddings) {
      if (!row.values) throw new Error('埋め込みバッチが空です')
      out.push(row.values)
    }
  }
  return out
}
