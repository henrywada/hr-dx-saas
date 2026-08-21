import { getUpcomingCareerAppointments } from './queries'
import { toJSTDateString, formatDateInJST } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { CareerAppointmentRow } from './types'

/** この日数以内に迫っていれば要対応として扱う */
const APPROACHING_DAYS = 3

export function toCareerDiscussionFeedItems(
  rows: CareerAppointmentRow[],
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
      dedupeKey: `career_discussion:${row.id}`,
      kind: 'system_notice',
      category: 'career_discussion',
      severity: daysUntil <= APPROACHING_DAYS ? 'warning' : 'info',
      title: `キャリア面談: ${row.scheduled_by_name || '上長'}さんと ${formatDateInJST(row.scheduled_at)}`,
      body: row.theme || null,
      actionLabel: null,
      href: APP_ROUTES.TENANT.CAREER_DISCUSSIONS,
      occurredAt: row.scheduled_at,
      dueDate,
      dismissible: true,
    }
  })
}

export const careerDiscussionFeedProvider: FeedProvider = {
  key: 'career_discussion',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []
    const rows = await getUpcomingCareerAppointments({ employeeId: ctx.employeeId })
    return toCareerDiscussionFeedItems(rows)
  },
}
