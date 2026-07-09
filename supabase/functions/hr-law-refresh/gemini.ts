const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSION = 1536

export type LawSummary = {
  title: string
  summary: string
  publishedAt: string | null
} | null

/**
 * 記事本文から構造化要約を生成する。
 * 施行日・対象企業・変更点・実務影響が不明確な場合は summary: null を返させ、
 * ハルシネーションを避ける（呼び出し側はその文書をスキップする）。
 */
export async function summarizeLawArticle(
  apiKey: string,
  title: string,
  sourceUrl: string,
  bodyText: string
): Promise<LawSummary> {
  const truncated = bodyText.slice(0, 6000)
  const systemInstruction =
    'あなたは日本の人事労務分野の専門家です。与えられた記事本文から、' +
    '人事担当者向けの要約を JSON で生成してください。' +
    '施行日・対象企業・変更点・実務影響の4点を含めてください。' +
    '本文からこれらの情報が読み取れない、または記事が法令改正と無関係な場合は、' +
    '必ず {"summary": null} だけを返してください（推測で埋めないこと）。' +
    '出力は次の JSON 形式のみ: {"summary": string | null, "publishedAt": "YYYY-MM-DD" | null}'

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `タイトル: ${title}\nURL: ${sourceUrl}\n\n本文:\n${truncated}` }],
      },
    ],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    throw new Error(`Gemini generateContent error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini から応答テキストが得られませんでした')

  let parsed: { summary?: string | null; publishedAt?: string | null }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini の応答が JSON として解析できませんでした')
  }

  if (!parsed.summary) return null

  return {
    title,
    summary: parsed.summary,
    publishedAt: parsed.publishedAt ?? null,
  }
}

/** 複数チャンクの埋め込みベクトルを一括取得する（batchEmbedContents） */
export async function embedChunksBatch(apiKey: string, chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return []

  const requests = chunks.map(text => ({
    model: `models/${GEMINI_EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBEDDING_DIMENSION,
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  )
  if (!res.ok) {
    throw new Error(`Gemini batchEmbedContents error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const embeddings = data.embeddings as { values: number[] }[] | undefined
  if (!embeddings || embeddings.length !== chunks.length) {
    throw new Error('埋め込みバッチの件数が一致しません')
  }
  return embeddings.map(e => e.values)
}

/** Supabase / pgvector へ渡す文字列形式 */
export function formatVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}
