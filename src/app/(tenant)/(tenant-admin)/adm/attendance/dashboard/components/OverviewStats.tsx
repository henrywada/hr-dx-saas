'use client'

import { Card } from '@/components/ui/Card'
import type { EmployeeAttendanceOverviewFilter, OverviewStats } from '@/features/attendance/types'

function formatAvgMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}時間${mm}分`
}

type OverviewStatsProps = {
  stats: OverviewStats
  activeFilter: EmployeeAttendanceOverviewFilter
  onFilterChange: (f: EmployeeAttendanceOverviewFilter) => void
}

export function OverviewStats({ stats, activeFilter, onFilterChange }: OverviewStatsProps) {
  const cards: {
    key: EmployeeAttendanceOverviewFilter
    label: string
    value: string
    sub?: string
  }[] = [
    {
      key: 'all',
      label: '総従業員数',
      value: `${stats.totalEmployees}名`,
    },
    {
      key: 'above_avg_ot',
      label: '平均残業時間',
      value: `${formatAvgMinutes(stats.avgOvertimeMinutes)}/月`,
      sub: '平均を上回る従業員で絞り込み',
    },
    {
      key: 'legal_risk',
      label: '法令違反リスク',
      value: `${stats.legalRiskEmployeeCount}名`,
      sub: '月45h超・6ヶ月平均80h超・年360h超 等',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const selected = activeFilter === c.key
        const ring = selected ? 'ring-2 ring-primary ring-offset-2' : ''
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilterChange(c.key)}
            className={`text-left rounded-lg ${ring}`}
          >
            <Card variant={selected ? 'primary' : 'default'} className="h-full !p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
              {c.sub ? <p className="text-[11px] text-slate-400 mt-2 leading-snug">{c.sub}</p> : null}
            </Card>
          </button>
        )
      })}
    </div>
  )
}
