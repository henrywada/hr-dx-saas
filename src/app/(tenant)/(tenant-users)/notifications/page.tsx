import { getServerUser } from '@/lib/auth/server-user'
import { getAllFeedItems } from '@/features/dashboard/feed/queries'
import { FeedPanel } from '@/features/dashboard/components/FeedPanel'
import {
  getVisibleDashboardElementKeys,
  isDashboardElementVisible,
} from '@/features/dashboard-ui-visibility/queries'
import { buildFeedProviderContext } from '@/features/dashboard/feed/provider'
import type { FeedItem } from '@/features/dashboard/feed/types'

export default async function NotificationsPage() {
  const user = await getServerUser()

  const visibleKeys = await getVisibleDashboardElementKeys(user?.tenant_id, 'top')
  const showFeed = isDashboardElementVisible(visibleKeys, 'top.section.feed')

  const feedCtx = buildFeedProviderContext(user)

  const items: FeedItem[] = feedCtx && showFeed ? await getAllFeedItems(feedCtx, visibleKeys) : []

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          お知らせ一覧
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          システムからの通知・アクションが必要な項目をまとめて確認できます。
        </p>
      </div>
      <FeedPanel items={items} showViewAllLink={false} />
    </div>
  )
}
