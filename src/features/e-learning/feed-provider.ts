import { getMyAssignments } from './queries'
import { isAssignmentOverdue } from './assignment-utils'
import { canAccessCourseViewer } from './publication-window'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'
import type { ElAssignment, ElCourse } from './types'

export type ElAssignmentWithCourse = ElAssignment & {
  completed_at: string | null
  course: ElCourse
}

export function toELearningFeedItems(assignments: ElAssignmentWithCourse[]): RawFeedItem[] {
  return assignments
    .filter(a => a.course?.status === 'published' && !a.completed_at)
    .filter(a => canAccessCourseViewer(a.course, a.completed_at))
    .map(a => {
      const overdue = isAssignmentOverdue(a.due_date, false)
      return {
        dedupeKey: `e_learning:${a.id}`,
        kind: 'action_prompt',
        category: 'e_learning',
        severity: overdue ? 'warning' : 'action',
        title: a.course.title,
        body: overdue
          ? '受講期限を過ぎています。早めに受講してください。'
          : 'eラーニングの受講が可能です',
        actionLabel: '受講する',
        href: APP_ROUTES.TENANT.EL_MY_COURSE_VIEWER(a.id),
        occurredAt: a.assigned_at,
        dueDate: a.due_date,
        dismissible: true,
      }
    })
}

export const eLearningFeedProvider: FeedProvider = {
  key: 'e_learning',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []
    const assignments = await getMyAssignments(ctx.employeeId)
    return toELearningFeedItems(assignments as unknown as ElAssignmentWithCourse[])
  },
}
