import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { getAllFeedItems } from '@/features/dashboard/feed/queries'
import { FeedPanel } from '@/features/dashboard/components/FeedPanel'
import {
  getVisibleDashboardElementKeys,
  isDashboardElementVisible,
} from '@/features/dashboard-ui-visibility/queries'
import { buildFeedProviderContext } from '@/features/dashboard/feed/provider'
import { APP_ROUTES } from '@/config/routes'
import type { FeedItem } from '@/features/dashboard/feed/types'

export default async function NotificationsPage() {
  const user = await getServerUser()

  const visibleKeys = await getVisibleDashboardElementKeys(user?.tenant_id, 'top')
  const showFeed = isDashboardElementVisible(visibleKeys, 'top.section.feed')

  const feedCtx = buildFeedProviderContext(user)

  const items: FeedItem[] = feedCtx && showFeed ? await getAllFeedItems(feedCtx, visibleKeys) : []

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            お知らせ一覧
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            システムからの通知・アクションが必要な項目をまとめて確認できます。
          </p>
        </div>
        <Link
          href={APP_ROUTES.TENANT.PORTAL}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>
      </div>
      <FeedPanel items={items} showViewAllLink={false} />
    </div>
  )
}
