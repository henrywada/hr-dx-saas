import type { FeedItem, FeedItemSeverity } from './types'

const SEVERITY_ORDER: Record<FeedItemSeverity, number> = {
  critical: 0,
  warning: 1,
  action: 2,
  info: 3,
}

/** 未読優先 → severity順 → dueDate近い順（なしは後） → occurredAt新しい順 */
export function sortFeedItems(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1

    if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity]) {
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    }

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? -1 : 1
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1

    return a.occurredAt < b.occurredAt ? 1 : -1
  })
}
