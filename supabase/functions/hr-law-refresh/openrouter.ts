import { stripSummaryBoilerplate } from './detail-cleaner.ts'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const SUMMARIZE_MODEL = 'google/gemini-2.5-flash'
/** 本文取得用（安価・tool対応） */
const CRAWL_MODEL = 'google/gemini-2.5-flash'
/** 検索専用: free ルータは tool calling が不安定なため固定モデルを使う */
const SEARCH_MODEL = 'google/gemini-2.5-flash'

export const ALLOWED_DOMAINS = [
  'mhlw.go.jp',
  'jsite.mhlw.go.jp',
  'e-gov.go.jp',
  'nenkin.go.jp',
  'jil.go.jp',
]

export type LawSummary = {
  title: string
  /** 一覧用の短い要約（2〜3文） */
  summary: string
  /** モーダル・AI回答用の詳細説明（情報元を開かなくても足りる量） */
  detail: string
  theme: string
  publishedAt: string | null
  expiresAt: string | null
  isExpired: boolean
}

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
  // site: は allowed_domains と二重指定になり Exa でヒットしにくいため除去
  const cleanedQuery = searchQuery
    .replace(/\bsite:[\w.-]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const body = {
    model: SEARCH_MODEL,
    temperature: 0.1,
    max_tokens: 2000,
    // サーバツールを必ず実行させる（モデル任せだと検索しないことがある）
    tool_choice: { type: 'openrouter:web_search' },
    messages: [
      {
        role: 'system',
        content:
          'あなたは日本の人事労務の調査アシスタントです。必ず web_search ツールで公式情報を検索し、' +
          '見つかったページを JSON のみで返す。形式: {"items":[{"title":string,"url":string,"snippet":string}]}。' +
          'HTMLの解説・通達ページを優先し、PDFのみの結果は避ける。無関係なら {"items":[]}。',
      },
      {
        role: 'user',
        content:
          `トピック: ${topic}\n検索キーワード: ${cleanedQuery || topic}\n` +
          '厚生労働省など公的サイトの、直近の改正・通達・ガイドライン・特設ページを優先して5件まで。',
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
  const message = data.choices?.[0]?.message ?? {}
  const content = message.content ?? ''
  const annotations = message.annotations ?? []

  let items: SearchHit[] = []
  try {
    const m = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null
    if (m) {
      const parsed = JSON.parse(m[0])
      items = (parsed.items ?? []).map((i: { title?: string; url?: string; snippet?: string }) => ({
        title: i.title ?? '',
        url: i.url ?? '',
        snippet: i.snippet ?? '',
      }))
    }
  } catch {
    // annotations へフォールバック
  }

  if (items.length === 0 && Array.isArray(annotations)) {
    items = annotations.flatMap(
      (a: {
        type?: string
        url?: string
        title?: string
        content?: string
        url_citation?: { url?: string; title?: string; content?: string }
      }) => {
        if (a.url) {
          return [{ title: a.title ?? '', url: a.url, snippet: a.content ?? '' }]
        }
        if (a.url_citation?.url) {
          return [
            {
              title: a.url_citation.title ?? '',
              url: a.url_citation.url,
              snippet: a.url_citation.content ?? '',
            },
          ]
        }
        return []
      }
    )
  }

  // 本文中の URL を最後の手段で抽出
  if (items.length === 0 && typeof content === 'string') {
    const urlRe = /https?:\/\/[^\s\]"'<>]+/g
    const urls = content.match(urlRe) ?? []
    items = urls.map(url => ({ title: '', url: url.replace(/[),.;]+$/, ''), snippet: '' }))
  }

  const filtered = items.filter(i => i.url && isAllowedUrl(i.url)).slice(0, maxResults)
  if (filtered.length === 0) {
    console.error('[hr-law-refresh] search 0 hits', {
      topic,
      cleanedQuery,
      contentPreview: typeof content === 'string' ? content.slice(0, 300) : content,
      annotationCount: Array.isArray(annotations) ? annotations.length : 0,
      model: data.model,
    })
  }
  return filtered
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
): Promise<LawSummary | null> {
  // 詳細説明のため本文を十分に渡す（トークン上限内）
  const truncated = bodyText.slice(0, 24000)
  const body = {
    model: SUMMARIZE_MODEL,
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'あなたは日本の中小企業向け人事労務の専門家です。公式ページ本文から人事責任者・経営者が' +
          '情報元URLを開かなくても実務判断できる説明を作る。JSON のみ返す:\n' +
          '{"title":string,"summary":string|null,"detail":string|null,"theme":string,' +
          '"publishedAt":"YYYY-MM-DD"|null,"expiresAt":"YYYY-MM-DD"|null,"isExpired":boolean}\n' +
          'summary: 一覧用。2〜3文・200字程度。要点のみ。\n' +
          'detail: 詳細説明。800〜2000字程度を目安。次の観点を（分かる範囲で）盛り込む:\n' +
          '何が変わったか／現状の制度内容、施行日・適用開始・経過措置、対象企業・対象者、\n' +
          '人事が取るべき実務対応、数値（料率・金額・期限等）。推測で補わない。\n' +
          '重要: 上記の観点は執筆の指示であり、見出しとして出力してはならない。\n' +
          '見出しを付ける場合は、その文書固有の内容を表す具体的な見出しにすること\n' +
          '（例: 「連続勤務規制」「賃金のデジタル払い」）。\n' +
          'AI人事アシスタントがこの detail だけで正確に回答できる情報量にすること。\n' +
          'theme は 賃金/社会保険/ストレスチェック/ハラスメント/育児介護/労働時間/安全衛生/障害者雇用/その他。\n' +
          '法令改正・通達・ガイドラインと無関係なら summary:null かつ detail:null。',
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
    detail?: string | null
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
  // 定型見出しが混入すると全文書で同一文字列となり、検索の埋め込み精度を落とすため除去する
  const detail = stripSummaryBoilerplate(parsed.detail ?? '') || parsed.summary

  return {
    title: parsed.title || title,
    summary: parsed.summary,
    detail,
    theme: parsed.theme || 'その他',
    publishedAt: parsed.publishedAt ?? null,
    expiresAt: parsed.expiresAt ?? null,
    isExpired: !!parsed.isExpired,
  }
}
