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

/** embedChunks が必要とする最小クライアント（テストで差し替え可能にするため） */
type EmbeddingClient = {
  models: {
    embedContent: (args: {
      model: string
      contents: string[]
      config: { outputDimensionality: number; taskType: string }
    }) => Promise<{ embeddings?: { values?: number[] }[] }>
  }
}

/**
 * 複数チャンクの埋め込みを取得（取り込み用）。
 * 文書登録用途のため taskType は RETRIEVAL_DOCUMENT を指定する。
 *
 * チャンクと埋め込みの対応ズレ（＝別チャンクに別ベクトルが付く「桁ずれ」事故）を防ぐため、
 * バッチ単位の件数一致に加えて最終的な総件数が入力と一致することを保証する。
 * `client` は省略時に本番クライアントを使う（テストで注入するため）。
 */
export async function embedChunks(chunks: string[], client?: EmbeddingClient): Promise<number[][]> {
  const ai = client ?? (getGeminiClient() as unknown as EmbeddingClient)
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
  // 総件数の最終ガード（チャンクと 1:1 で対応していることの保証）
  if (out.length !== chunks.length) {
    throw new Error(
      `埋め込み件数がチャンク数と一致しません: expected ${chunks.length}, got ${out.length}`
    )
  }
  return out
}
