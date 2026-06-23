'use client'

import type { MonthlyStatsView } from '@/features/attendance/types'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const LEGAL_OT_CAP_MINUTES = 45 * 60

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}時間${m}分`
}

type Props = {
  stats: MonthlyStatsView | null
  unresolvedAlertCount: number
  loadError: string | null
}

export function MonthlyStats({
  stats,
  unresolvedAlertCount,
  loadError,
}: Props) {
  const ot = stats?.overtime_minutes ?? 0
  const otRatio = Math.min(1, ot / LEGAL_OT_CAP_MINUTES)
  const barColor =
    ot >= LEGAL_OT_CAP_MINUTES
      ? 'bg-red-500'
      : ot >= LEGAL_OT_CAP_MINUTES * 0.8
        ? 'bg-orange-500'
        : 'bg-primary'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <Card variant="default" className="!p-4 md:!p-5">
        <p className="text-xs font-medium text-slate-500 mb-1">総労働時間</p>
        <p className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
          {stats ? formatMinutes(stats.total_work_minutes) : '—'}
        </p>
        {stats?.source === 'aggregated' && (
          <p className="text-[10px] text-slate-400 mt-1">日次記録から集計</p>
        )}
        {stats?.avg_daily_work_minutes != null && (
          <p className="text-[10px] text-slate-500 mt-1">
            平均 {formatMinutes(stats.avg_daily_work_minutes)} / 日（勤務記録あり）
          </p>
        )}
      </Card>

      <Card variant="default" className="!p-4 md:!p-5">
        <p className="text-xs font-medium text-slate-500 mb-1">
          残業時間（法定45h）
        </p>
        <p className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
          {stats ? formatMinutes(stats.overtime_minutes) : '—'}
        </p>
        {stats && (
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${otRatio * 100}%` }}
            />
          </div>
        )}
      </Card>

      <Card variant="default" className="!p-4 md:!p-5">
        <p className="text-xs font-medium text-slate-500 mb-1">休日出勤</p>
        <p className="text-lg md:text-xl font-bold text-slate-900 tabular-nums">
          {stats ? formatMinutes(stats.holiday_work_minutes) : '—'}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">月次・日次の休日フラグ集計</p>
      </Card>

      <Card variant="default" className="!p-4 md:!p-5">
        <p className="text-xs font-medium text-slate-500 mb-1">アラート</p>
        <p
          className={cn(
            'text-lg md:text-xl font-bold tabular-nums',
            unresolvedAlertCount > 0 ? 'text-red-600' : 'text-slate-900',
          )}
        >
          {loadError ? '—' : `${unresolvedAlertCount}件`}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">当月・未解決</p>
      </Card>
    </div>
  )
}
