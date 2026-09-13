const NOTION_VERSION = '2022-06-28'
const QUERY_URL = (databaseId: string) =>
  `https://api.notion.com/v1/databases/${databaseId}/query`

export type NotionQueryResult = {
  results: Array<{ id: string; properties: Record<string, unknown> }>
  has_more: boolean
  next_cursor: string | null
}

type NotionSort = { property: string; direction: 'ascending' | 'descending' }

function requireApiKey(): string {
  const key = process.env.NOTION_API_KEY
  if (!key) {
    throw new Error('NOTION_API_KEY is not configured')
  }
  return key
}

/** ハイフン有無を正規化して Notion に渡す */
export function normalizeNotionId(id: string): string {
  const compact = id.replace(/-/g, '')
  if (compact.length !== 32) return id
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
}

async function fetchAllPages(
  databaseId: string,
  sorts?: NotionSort[]
): Promise<NotionQueryResult['results']> {
  const key = requireApiKey()
  const pages: NotionQueryResult['results'] = []
  let cursor: string | undefined

  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor
    if (sorts) body.sorts = sorts

    const res = await fetch(QUERY_URL(normalizeNotionId(databaseId)), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const text = await res.text()
      const error = new Error(
        `Notion query failed (${res.status}): ${text.slice(0, 300)}`
      )
      ;(error as Error & { status?: number }).status = res.status
      throw error
    }

    const json = (await res.json()) as NotionQueryResult
    pages.push(...json.results)
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined
  } while (cursor)

  return pages
}

export async function queryDatabase(
  databaseId: string
): Promise<NotionQueryResult['results']> {
  const sorts: NotionSort[] = [{ property: '収集日時', direction: 'descending' }]

  try {
    return await fetchAllPages(databaseId, sorts)
  } catch (error) {
    const status =
      error instanceof Error
        ? (error as Error & { status?: number }).status
        : undefined
    // 収集日時プロパティが無い DB では 400 になるため、ソートなしで再取得する
    if (status === 400) {
      return fetchAllPages(databaseId)
    }
    throw error
  }
}

export function getNotionDatabaseIds(): {
  hrTrend: string
  grant: string
  ai: string
} | null {
  const hrTrend = process.env.NOTION_DB_HR_TREND_ID
  const grant = process.env.NOTION_DB_GRANT_ID
  const ai = process.env.NOTION_DB_AI_ID
  if (!process.env.NOTION_API_KEY || !hrTrend || !grant || !ai) return null
  return { hrTrend, grant, ai }
}
