/**
 * Gemini 埋め込み（Deno Edge Function 用）。
 *
 * hr_law_chunks は検索時も Gemini で埋め込むため、収集側も同じモデル・
 * 同じ次元・同じ taskType 体系に揃える必要がある。
 * （OpenAI text-embedding-3-small は日本語の法令文書で類似度が 0.24〜0.40 に
 *   圧縮され、関連チャンクより無関係チャンクが上位に来るため移行した）
 *
 * src/features/inquiry-chat/embedding.ts と同じ仕様
 * （Deno Edge Function は src/ を import できないため個別に保持する）。
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSION = 1536

/** 一度に送る件数（API のバッチ上限を考慮） */
const BATCH = 64

type EmbedResponse = {
  embeddings?: { values?: number[] }[]
}

/**
 * 文書チャンクの埋め込みを取得する。
 * 文書登録用途のため taskType は RETRIEVAL_DOCUMENT を指定する
 * （検索クエリ側は RETRIEVAL_QUERY を使い、非対称検索の精度を上げる）。
 */
export async function embedChunksGemini(apiKey: string, chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return []

  const out: number[][] = []

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)

    const res = await fetch(
      `${GEMINI_BASE}/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map(text => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIMENSION,
          })),
        }),
      }
    )

    if (!res.ok) {
      throw new Error(`Gemini embeddings error (${res.status}): ${await res.text()}`)
    }

    const data = (await res.json()) as EmbedResponse
    const rows = data.embeddings ?? []
    if (rows.length !== batch.length) {
      throw new Error('埋め込みバッチの件数が一致しません')
    }

    for (const row of rows) {
      const values = row.values
      if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values?.length}`
        )
      }
      out.push(values)
    }
  }

  return out
}

/** Supabase / pgvector へ渡す文字列形式 */
export function formatGeminiVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}
