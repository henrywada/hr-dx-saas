import { getMyOvertimeWarnings, type MyOvertimeWarningRow } from './queries'
import { alertTypeSeverity } from '@/features/attendance/types'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem, FeedItemSeverity } from '@/features/dashboard/feed/types'

/** closure_warnings.warning_type（36協定超過種別）の日本語ラベル */
const WARNING_TYPE_LABEL: Record<string, string> = {
  overtime_45h_exceeded: '月45時間の残業時間を超えています',
  overtime_100h_critical: '月100時間の残業時間を超えています（特別条項の上限）',
  overtime_avg80h_exceeded: '複数月平均の残業時間が80時間を超えています',
}

function toFeedSeverity(warningType: string): FeedItemSeverity {
  return alertTypeSeverity(warningType) >= 90 ? 'critical' : 'warning'
}

export function toOvertimeComplianceFeedItems(rows: MyOvertimeWarningRow[]): RawFeedItem[] {
  return rows.map(row => ({
    dedupeKey: `overtime_compliance:${row.id}`,
    kind: 'system_notice',
    category: 'overtime_compliance',
    severity: toFeedSeverity(row.warning_type),
    title: WARNING_TYPE_LABEL[row.warning_type] ?? '残業時間に関するアラートがあります',
    body: '上司に相談し、働き方の見直しをご検討ください。',
    actionLabel: null,
    href: APP_ROUTES.TENANT.OVERTIME_APPLICATION,
    occurredAt: row.created_at,
    dueDate: null,
    dismissible: true,
  }))
}

export const overtimeComplianceFeedProvider: FeedProvider = {
  key: 'overtime_compliance',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []
    const rows = await getMyOvertimeWarnings(ctx.employeeId)
    return toOvertimeComplianceFeedItems(rows)
  },
}
