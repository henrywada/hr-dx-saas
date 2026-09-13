export type NotionInfoTab = 'hr_trend' | 'grant' | 'ai'

export type NotionInfoItem = {
  id: string
  collectedAt: string | null
  title: string
  summary: string
  url: string | null
  body: string
  amount: string | null
  openDate: string | null
  deadline: string | null
  category: string | null
}

/** Notion databases.query の 1 ページ分（必要なキーだけ） */
export type NotionQueryPage = {
  id: string
  properties: Record<string, unknown>
}
