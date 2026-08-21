import { getTopAnnouncements } from './queries'
import type { Announcement } from './types'
import type { FeedProvider } from './feed/provider'
import type { RawFeedItem } from './feed/types'

export function toAnnouncementFeedItems(announcements: Announcement[]): RawFeedItem[] {
  return announcements.map(a => ({
    dedupeKey: `announcement:${a.id}`,
    kind: 'system_notice',
    category: 'hr_announcement',
    severity: 'info',
    title: a.title,
    body: a.body,
    actionLabel: null,
    // 詳細ページが未実装のため、既存同様リンクなし（Phase 3 の一覧ページで解消予定）
    href: null,
    occurredAt: a.publishedAt,
    dueDate: null,
    dismissible: true,
  }))
}

export const announcementFeedProvider: FeedProvider = {
  key: 'hr_announcement',
  // announcements は RLS のみでテナント分離されるため ctx は使わない
  async fetch(): Promise<RawFeedItem[]> {
    const announcements = await getTopAnnouncements()
    return toAnnouncementFeedItems(announcements)
  },
}
