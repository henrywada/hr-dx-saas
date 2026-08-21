import { getRecentKudosCountForRecipient } from './queries'
import { APP_ROUTES } from '@/config/routes'
import { formatCount } from '@/features/dashboard/feed/badge'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'

export function toKudosFeedItems(count: number, nowIso: string): RawFeedItem[] {
  if (count <= 0) return []

  return [
    {
      dedupeKey: 'kudos:recent',
      kind: 'system_notice',
      category: 'kudos',
      severity: 'info',
      title: '新着の感謝・称賛があります',
      body: `あなた宛にメッセージが届いています（${formatCount(count)}）`,
      actionLabel: null,
      href: APP_ROUTES.TENANT.KUDOS,
      occurredAt: nowIso,
      dueDate: null,
      // 件数集計のキーのため、既読にすると新着が来ても二度と未読に戻せなくなる。既読トグル対象外にする
      dismissible: false,
    },
  ]
}

export const kudosFeedProvider: FeedProvider = {
  key: 'kudos',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    const count = await getRecentKudosCountForRecipient(ctx.employeeId)
    return toKudosFeedItems(count, new Date().toISOString())
  },
}
