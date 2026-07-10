const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const EMBEDDING_DIMENSION = 1536
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const SUMMARIZE_MODEL = 'google/gemini-2.5-flash'
const CRAWL_MODEL = 'openrouter/free'

export const ALLOWED_DOMAINS = [
  'mhlw.go.jp',
  'jsite.mhlw.go.jp',
  'e-gov.go.jp',
  'nenkin.go.jp',
  'jil.go.jp',
]

export type LawSummary = {
  title: string
  summary: string
  theme: string
  publishedAt: string | null
  expiresAt: string | null
  isExpired: boolean
} | null

export type SearchHit = {
  title: string
  url: string
  snippet: string
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://app.hr-dx.jp',
    'X-Title': 'HR-DX SaaS hr-law-refresh',
  }
}

/** トピック探索: web_search で公式ドメイン限定の URL を収集 */
export async function searchTopicUrls(
  apiKey: string,
  topic: string,
  searchQuery: string,
  maxResults = 5
): Promise<SearchHit[]> {
  const body = {
    model: CRAWL_MODEL,
    temperature: 0.1,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          '日本の人事労務向けに公的サイトだけを検索し、関連ページを JSON で返す。' +
          '形式: {"items":[{"title":string,"url":string,"snippet":string}]}。無関係なら空配列。',
      },
      {
        role: 'user',
        content: `トピック: ${topic}\n検索条件: ${searchQuery}\n直近の改正・通達・ガイドラインを優先。`,
      },
    ],
    tools: [
      {
        type: 'openrouter:web_search',
        parameters: {
          engine: 'exa',
          max_results: maxResults,
          max_total_results: maxResults,
          search_context_size: 'medium',
          allowed_domains: ALLOWED_DOMAINS,
        },
      },
    ],
  }

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter search error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  const annotations = data.choices?.[0]?.message?.annotations ?? []

  let items: SearchHit[] = []
  try {
    const m = content.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      items = (parsed.items ?? []).map((i: { title?: string; url?: string; snippet?: string }) => ({
        title: i.title ?? '',
        url: i.url ?? '',
        snippet: i.snippet ?? '',
      }))
    }
  } catch {
    // fall through to annotations
  }

  if (items.length === 0 && Array.isArray(annotations)) {
    items = annotations
      .filter((a: { url?: string }) => a.url)
      .map((a: { title?: string; url?: string; content?: string }) => ({
        title: a.title ?? '',
        url: a.url ?? '',
        snippet: a.content ?? '',
      }))
  }

  return items.filter(i => i.url && isAllowedUrl(i.url)).slice(0, maxResults)
}

export function isAllowedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

/** ページ本文取得（無料 openrouter fetch 優先） */
export async function fetchPageText(apiKey: string, url: string): Promise<string> {
  const body = {
    model: CRAWL_MODEL,
    temperature: 0,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: '指定 URL の本文をできるだけ忠実に抽出し、プレーンテキストのみ返す。',
      },
      { role: 'user', content: `次の URL の本文を取得してください: ${url}` },
    ],
    tools: [
      {
        type: 'openrouter:web_fetch',
        parameters: {
          engine: 'openrouter',
          max_uses: 1,
          max_content_tokens: 20000,
          allowed_domains: ALLOWED_DOMAINS,
        },
      },
    ],
  }
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter fetch error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

export async function summarizeLawArticle(
  apiKey: string,
  title: string,
  sourceUrl: string,
  bodyText: string
): Promise<LawSummary> {
  const truncated = bodyText.slice(0, 6000)
  const body = {
    model: SUMMARIZE_MODEL,
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          '日本の人事労務専門家として公式記事を要約する。JSON のみ返す: ' +
          '{"title":string,"summary":string|null,"theme":string,' +
          '"publishedAt":"YYYY-MM-DD"|null,"expiresAt":"YYYY-MM-DD"|null,"isExpired":boolean}。' +
          'theme は 賃金/社会保険/ストレスチェック/ハラスメント/育児介護/労働時間/安全衛生/障害者雇用/その他。' +
          '法令改正と無関係、または要約不能なら summary:null。推測禁止。',
      },
      {
        role: 'user',
        content: `タイトル: ${title}\nURL: ${sourceUrl}\n\n本文:\n${truncated}`,
      },
    ],
  }
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter summarize error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenRouter から応答テキストが得られませんでした')

  let parsed: {
    title?: string
    summary?: string | null
    theme?: string
    publishedAt?: string | null
    expiresAt?: string | null
    isExpired?: boolean
  }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('OpenRouter の応答が JSON として解析できませんでした')
  }
  if (!parsed.summary) return null

  return {
    title: parsed.title || title,
    summary: parsed.summary,
    theme: parsed.theme || 'その他',
    publishedAt: parsed.publishedAt ?? null,
    expiresAt: parsed.expiresAt ?? null,
    isExpired: !!parsed.isExpired,
  }
}

export async function embedChunksBatch(apiKey: string, chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return []
  const out: number[][] = []
  const BATCH = 64
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSION,
      }),
    })
    if (!res.ok) {
      throw new Error(`OpenRouter embeddings error (${res.status}): ${await res.text()}`)
    }
    const data = await res.json()
    const rows = (data.data as { embedding: number[]; index: number }[]).sort(
      (a, b) => a.index - b.index
    )
    if (rows.length !== batch.length) {
      throw new Error('埋め込みバッチの件数が一致しません')
    }
    for (const row of rows) out.push(row.embedding)
  }
  return out
}

export function formatVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}
