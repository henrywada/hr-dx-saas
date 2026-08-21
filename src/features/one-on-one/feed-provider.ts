import { getMyUpcomingOneOnOnes } from './queries'
import { toJSTDateString, formatDateInJST } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { UpcomingOneOnOneRow } from './types'

/** この日数以内に迫っていれば要対応として扱う */
const APPROACHING_DAYS = 3

export function toOneOnOneFeedItems(
  rows: UpcomingOneOnOneRow[],
  todayYmd: string = toJSTDateString()
): RawFeedItem[] {
  return rows.map(row => {
    const dueDate = toJSTDateString(new Date(row.scheduled_at))
    const daysUntil = Math.ceil(
      (new Date(`${dueDate}T00:00:00+09:00`).getTime() -
        new Date(`${todayYmd}T00:00:00+09:00`).getTime()) /
        (24 * 60 * 60 * 1000)
    )

    return {
      dedupeKey: `one_on_one:${row.id}`,
      kind: 'system_notice',
      category: 'one_on_one',
      severity: daysUntil <= APPROACHING_DAYS ? 'warning' : 'info',
      title: `1on1面談: ${row.manager_name || '上長'}さんと ${formatDateInJST(row.scheduled_at)}`,
      body: row.theme || null,
      actionLabel: null,
      href: APP_ROUTES.TENANT.MY_ONE_ON_ONE,
      occurredAt: row.scheduled_at,
      dueDate,
      dismissible: true,
    }
  })
}

export const oneOnOneFeedProvider: FeedProvider = {
  key: 'one_on_one',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []
    const rows = await getMyUpcomingOneOnOnes(ctx.employeeId)
    return toOneOnOneFeedItems(rows)
  },
}
