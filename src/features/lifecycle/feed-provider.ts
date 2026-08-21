import { getMyPendingLifecycleTasks } from './queries'
import { canManageLifecycle } from './types'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { PendingTaskRow } from './types'

const LIFECYCLE_TYPE_LABEL: Record<PendingTaskRow['lifecycle_type'], string> = {
  onboarding: '入社フロー',
  offboarding: '退社フロー',
}

export function toLifecycleFeedItems(
  pending: PendingTaskRow[],
  appRole: string | null | undefined
): RawFeedItem[] {
  const canManage = canManageLifecycle(appRole)

  return pending.map(task => ({
    dedupeKey: `lifecycle:${task.task_id}`,
    kind: 'action_prompt',
    category: 'lifecycle',
    severity: task.is_overdue ? 'warning' : 'action',
    title: task.title,
    body: `${LIFECYCLE_TYPE_LABEL[task.lifecycle_type]}・${task.instance_employee_name}${
      task.is_overdue ? '（期限超過）' : ''
    }`,
    actionLabel: canManage ? '確認する' : null,
    href: canManage ? APP_ROUTES.TENANT.ADMIN_LIFECYCLE : null,
    occurredAt: task.due_date ?? new Date(0).toISOString(),
    dueDate: task.due_date,
    dismissible: true,
  }))
}

export const lifecycleFeedProvider: FeedProvider = {
  key: 'lifecycle',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    const pending = await getMyPendingLifecycleTasks(ctx.employeeId)
    return toLifecycleFeedItems(pending, ctx.appRole)
  },
}
