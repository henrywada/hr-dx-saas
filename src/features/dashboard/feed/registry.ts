import { announcementFeedProvider } from '@/features/dashboard/feed-provider'
import { consultationFeedProvider } from '@/features/consultation/feed-provider'
import { kudosFeedProvider } from '@/features/recognition/feed-provider'
import { questionnaireFeedProvider } from '@/features/questionnaire/feed-provider'
import { lifecycleFeedProvider } from '@/features/lifecycle/feed-provider'
import type { FeedProvider } from './provider'

// 新しい通知ソースを追加する場合はここに1行追加するだけでよい（page.tsx の変更は不要）
export const FEED_PROVIDERS: FeedProvider[] = [
  announcementFeedProvider,
  consultationFeedProvider,
  kudosFeedProvider,
  questionnaireFeedProvider,
  lifecycleFeedProvider,
]
