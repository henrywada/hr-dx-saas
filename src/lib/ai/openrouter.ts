/**
 * OpenRouter クライアント（人事アシスタント・法令ナレッジ用の単一ソース）。
 * OpenAI 互換の Chat Completions / Embeddings API を使用する。
 */

export const OPENROUTER_CHAT_MODEL = 'google/gemini-2.5-flash'
/** 要約・分類向け（安価） */
export const OPENROUTER_SUMMARIZE_MODEL = 'google/gemini-2.5-flash'
/** 週次探索・オンデマンド収集向け（無料枠優先。tool calling 対応モデルをルータが選択） */
export const OPENROUTER_CRAWL_MODEL = 'openrouter/free'
export const OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
export const OPENROUTER_EMBEDDING_DIMENSION = 1536

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_TIMEOUT_MS = 120_000

/** 公的ドメインのホワイトリスト（法令収集・オンデマンド検索共通） */
export const HR_LAW_ALLOWED_DOMAINS = [
  'mhlw.go.jp',
  'jsite.mhlw.go.jp',
  'e-gov.go.jp',
  'nenkin.go.jp',
  'jil.go.jp',
] as const

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OpenRouterTool =
  | {
      type: 'openrouter:web_search'
      parameters?: {
        engine?: 'auto' | 'native' | 'exa' | 'firecrawl' | 'parallel' | 'perplexity'
        max_results?: number
        max_total_results?: number
        search_context_size?: 'low' | 'medium' | 'high'
        allowed_domains?: string[]
        excluded_domains?: string[]
      }
    }
  | {
      type: 'openrouter:web_fetch'
      parameters?: {
        engine?: 'auto' | 'native' | 'exa' | 'openrouter' | 'firecrawl' | 'parallel'
        max_uses?: number
        max_content_tokens?: number
        allowed_domains?: string[]
        blocked_domains?: string[]
      }
    }

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY が設定されていません')
  }
  return apiKey
}

function defaultHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://app.hr-dx.jp',
    'X-Title': 'HR-DX SaaS',
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export type OpenRouterChatOptions = {
  model?: string
  messages: OpenRouterMessage[]
  temperature?: number
  maxTokens?: number
  json?: boolean
  tools?: OpenRouterTool[]
  timeoutMs?: number
}

export type OpenRouterChatResult = {
  content: string
  /** url_citation 等の注釈（web_search 利用時） */
  annotations?: Array<{
    type?: string
    url?: string
    title?: string
    content?: string
  }>
  raw: unknown
}

/**
 * Chat Completions を呼び、アシスタント応答テキストを返す。
 * server tools（web_search / web_fetch）指定時は OpenRouter 側で実行される。
 */
export async function openRouterChat(opts: OpenRouterChatOptions): Promise<OpenRouterChatResult> {
  const apiKey = getApiKey()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const model = opts.model ?? OPENROUTER_CHAT_MODEL

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 2000,
  }
  if (opts.json) {
    body.response_format = { type: 'json_object' }
  }
  if (opts.tools?.length) {
    body.tools = opts.tools
  }

  const res = await fetchWithTimeout(
    `${OPENROUTER_BASE}/chat/completions`,
    {
      method: 'POST',
      headers: defaultHeaders(apiKey),
      body: JSON.stringify(body),
    },
    timeoutMs
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter chat error (${res.status}): ${errText}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null
        annotations?: OpenRouterChatResult['annotations']
      }
    }>
  }

  const message = data.choices?.[0]?.message
  const content = message?.content?.trim() || ''
  if (!content) {
    throw new Error('AI からの応答が空でした')
  }

  return {
    content,
    annotations: message?.annotations,
    raw: data,
  }
}

/**
 * 単一テキストの埋め込み（クエリ用）。dimensions=1536 で既存 pgvector と互換。
 */
export async function openRouterEmbedQuery(text: string): Promise<number[]> {
  const vectors = await openRouterEmbedTexts([text.slice(0, 1800)])
  return vectors[0]
}

/**
 * 複数テキストの埋め込み（文書登録用）。
 */
export async function openRouterEmbedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const apiKey = getApiKey()

  const out: number[][] = []
  const BATCH = 64
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const res = await fetchWithTimeout(
      `${OPENROUTER_BASE}/embeddings`,
      {
        method: 'POST',
        headers: defaultHeaders(apiKey),
        body: JSON.stringify({
          model: OPENROUTER_EMBEDDING_MODEL,
          input: batch,
          dimensions: OPENROUTER_EMBEDDING_DIMENSION,
        }),
      },
      DEFAULT_TIMEOUT_MS
    )
    if (!res.ok) {
      throw new Error(`OpenRouter embeddings error (${res.status}): ${await res.text()}`)
    }
    const data = (await res.json()) as {
      data?: Array<{ embedding: number[]; index: number }>
    }
    const rows = data.data ?? []
    if (rows.length !== batch.length) {
      throw new Error('埋め込みバッチの件数が一致しません')
    }
    rows
      .sort((a, b) => a.index - b.index)
      .forEach(row => {
        if (!row.embedding || row.embedding.length !== OPENROUTER_EMBEDDING_DIMENSION) {
          throw new Error(
            `埋め込み次元が一致しません: expected ${OPENROUTER_EMBEDDING_DIMENSION}, got ${row.embedding?.length}`
          )
        }
        out.push(row.embedding)
      })
  }
  return out
}

/** Supabase / pgvector へ渡す文字列形式 */
export function formatOpenRouterVectorForPg(values: number[]): string {
  if (values.length !== OPENROUTER_EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${OPENROUTER_EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}

/**
 * 公的ドメイン限定の web_search 付きチャット。
 * モデルが検索・取得した結果をテキストで返す（構造化は呼び出し側で行う）。
 */
export async function openRouterWebSearchChat(opts: {
  system: string
  user: string
  model?: string
  maxResults?: number
  timeoutMs?: number
}): Promise<OpenRouterChatResult> {
  return openRouterChat({
    model: opts.model ?? OPENROUTER_CRAWL_MODEL,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: 0.1,
    maxTokens: 3000,
    timeoutMs: opts.timeoutMs ?? 180_000,
    tools: [
      {
        type: 'openrouter:web_search',
        parameters: {
          engine: 'exa',
          max_results: opts.maxResults ?? 5,
          max_total_results: opts.maxResults ?? 5,
          search_context_size: 'medium',
          allowed_domains: [...HR_LAW_ALLOWED_DOMAINS],
        },
      },
      {
        type: 'openrouter:web_fetch',
        parameters: {
          engine: 'openrouter',
          max_uses: 3,
          max_content_tokens: 20000,
          allowed_domains: [...HR_LAW_ALLOWED_DOMAINS],
        },
      },
    ],
  })
}
