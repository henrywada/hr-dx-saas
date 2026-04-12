import OpenAI from 'openai'
import { CHUNK_MAX_CHARS, EMBEDDING_DIMENSION, EMBEDDING_MODEL } from './constants'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/** Supabase / pgvector へ渡す文字列形式 */
export function formatVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(`埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`)
  }
  return `[${values.join(',')}]`
}

/**
 * テキストの埋め込みベクトルを取得（長文は先頭のみ — クエリ用）
 */
export async function embedQueryText(text: string): Promise<number[]> {
  const trimmed = text.slice(0, CHUNK_MAX_CHARS * 2)
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  })
  const v = res.data[0]?.embedding
  if (!v) throw new Error('埋め込みが空です')
  return v
}

const BATCH = 64

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })
    const sorted = [...res.data].sort((a, b) => a.index - b.index)
    for (const row of sorted) {
      if (!row.embedding) throw new Error('埋め込みバッチが空です')
      out.push(row.embedding)
    }
  }
  return out
}
