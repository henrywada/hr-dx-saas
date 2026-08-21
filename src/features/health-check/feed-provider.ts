import { getLatestHealthCheckSummaryForEmployee } from './queries'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { HealthCheckSummaryForInterview } from './types'

export function toHealthCheckFeedItems(
  summary: HealthCheckSummaryForInterview | null
): RawFeedItem[] {
  if (!summary) return []

  const occurredAt = summary.examDate ?? new Date(0).toISOString()
  const items: RawFeedItem[] = []

  if (summary.doctorInterviewRecommended) {
    items.push({
      dedupeKey: `health_check:doctor_interview:${summary.examDate ?? 'unknown'}`,
      kind: 'action_prompt',
      category: 'health_check',
      severity: 'warning',
      title: '産業医との面談が推奨されています',
      body: '定期健康診断の結果を踏まえた面談です。結果画面から予約できます。',
      actionLabel: '結果を確認する',
      href: APP_ROUTES.TENANT.HEALTH_CHECK,
      occurredAt,
      dueDate: null,
      dismissible: true,
    })
  }

  if (summary.nurseInterviewRecommended) {
    items.push({
      dedupeKey: `health_check:nurse_interview:${summary.examDate ?? 'unknown'}`,
      kind: 'action_prompt',
      category: 'health_check',
      severity: 'warning',
      title: '保健師との面談が推奨されています',
      body: '定期健康診断の結果を踏まえた面談です。結果画面から予約できます。',
      actionLabel: '結果を確認する',
      href: APP_ROUTES.TENANT.HEALTH_CHECK,
      occurredAt,
      dueDate: null,
      dismissible: true,
    })
  }

  return items
}

export const healthCheckFeedProvider: FeedProvider = {
  key: 'health_check',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []
    const summary = await getLatestHealthCheckSummaryForEmployee(ctx.employeeId)
    return toHealthCheckFeedItems(summary)
  },
}
