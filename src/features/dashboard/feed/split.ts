import type { FeedItem } from './types'

/** kind で「お知らせ」(system_notice) と「要対応タスク」(action_prompt) に振り分ける */
export function splitFeedItemsByKind(items: FeedItem[]): {
  noticeItems: FeedItem[]
  actionItems: FeedItem[]
} {
  const noticeItems = items.filter(item => item.kind === 'system_notice')
  const actionItems = items.filter(item => item.kind === 'action_prompt')
  return { noticeItems, actionItems }
}
