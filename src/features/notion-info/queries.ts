import { toJSTDateString } from '@/lib/datetime'

import { filterExpiredGrants, sortByCollectedAtDesc } from './filter'
import { mapNotionPage } from './map-page'
import { getNotionDatabaseIds, queryDatabase } from './notion-client'
import type { NotionInfoItem, NotionInfoTab } from './types'

export type NotionInfoBoardData = {
  configured: boolean
  errorMessage: string | null
  items: Record<NotionInfoTab, NotionInfoItem[]>
}

const EMPTY: Record<NotionInfoTab, NotionInfoItem[]> = {
  hr_trend: [],
  grant: [],
  ai: [],
}

export async function getNotionInfoBoard(): Promise<NotionInfoBoardData> {
  const ids = getNotionDatabaseIds()
  if (!ids) {
    return {
      configured: false,
      errorMessage: '情報掲示板の接続設定がありません。運営者に連絡してください。',
      items: EMPTY,
    }
  }

  try {
    const [hrPages, grantPages, aiPages] = await Promise.all([
      queryDatabase(ids.hrTrend),
      queryDatabase(ids.grant),
      queryDatabase(ids.ai),
    ])
    const today = toJSTDateString()
    return {
      configured: true,
      errorMessage: null,
      items: {
        hr_trend: sortByCollectedAtDesc(hrPages.map(mapNotionPage)),
        grant: sortByCollectedAtDesc(
          filterExpiredGrants(grantPages.map(mapNotionPage), today)
        ),
        ai: sortByCollectedAtDesc(aiPages.map(mapNotionPage)),
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Notion の取得に失敗しました'
    return { configured: true, errorMessage: message, items: EMPTY }
  }
}
