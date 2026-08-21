import { getPendingAssignedQuestionnairesForTop } from '@/features/dashboard/queries'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { AssignedQuestionnaire } from './types'

function periodSubtitle(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return `実施期間：${start} ～ ${end}`
  if (start) return `実施期間：${start} ～`
  return null
}

function questionnaireBody(q: AssignedQuestionnaire): string | null {
  const period = periodSubtitle(q.period_start_date, q.period_end_date)
  if (q.hr_message && period) return `${period}\n${q.hr_message}`
  return q.hr_message ?? period
}

export function toQuestionnaireFeedItems(pending: AssignedQuestionnaire[]): RawFeedItem[] {
  return pending.map(q => ({
    dedupeKey: `questionnaire:${q.assignment_id}`,
    kind: 'action_prompt',
    category: 'questionnaire',
    severity: 'action',
    title: q.title,
    body: questionnaireBody(q),
    actionLabel: '回答する',
    href: `${APP_ROUTES.TENANT.SURVEY_ANSWERS}?id=${encodeURIComponent(q.assignment_id)}`,
    occurredAt: q.assigned_at,
    dueDate: q.period_end_date ?? q.deadline_date,
    dismissible: true,
  }))
}

export const questionnaireFeedProvider: FeedProvider = {
  key: 'questionnaire',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    const pending = await getPendingAssignedQuestionnairesForTop(ctx.employeeId)
    return toQuestionnaireFeedItems(pending)
  },
}
