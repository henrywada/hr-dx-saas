import { getPendingConsultationCount } from './queries'
import { APP_ROUTES } from '@/config/routes'
import { formatCount } from '@/features/dashboard/feed/badge'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem } from '@/features/dashboard/feed/types'

/** 産業医・保健師・人事系の役割は管理キューへ、それ以外（上司）は自分の受信箱へ誘導 */
const CONSULTATION_STAFF_ROLES = ['hr', 'hr_manager', 'hsc', 'company_doctor', 'company_nurse']

export function toConsultationFeedItems(
  count: number,
  appRole: string | null | undefined,
  nowIso: string
): RawFeedItem[] {
  if (count <= 0) return []

  const href = CONSULTATION_STAFF_ROLES.includes(appRole ?? '')
    ? APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE
    : APP_ROUTES.TENANT.CONSULTATION_INBOX

  return [
    {
      dedupeKey: 'consultation:pending',
      kind: 'system_notice',
      category: 'consultation',
      severity: 'warning',
      title: '対応が必要な相談があります',
      body: `悩み・相談窓口に新着の相談が届いています（${formatCount(count)}）`,
      actionLabel: null,
      href,
      occurredAt: nowIso,
      dueDate: null,
      // 件数集計のキーのため、既読にすると新着が来ても二度と未読に戻せなくなる。既読トグル対象外にする
      dismissible: false,
    },
  ]
}

export const consultationFeedProvider: FeedProvider = {
  key: 'consultation',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    const count = await getPendingConsultationCount()
    return toConsultationFeedItems(count, ctx.appRole, new Date().toISOString())
  },
}
