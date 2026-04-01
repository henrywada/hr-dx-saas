'use client'

import type { ReactNode } from 'react'
import useSWR from 'swr'
import { AlertCircle, AlertTriangle, Clock, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { SummaryKPI } from '@/app/api/analysis/summary/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type SummaryResponse = { summary: SummaryKPI }

type KpiCardsProps = {
  yearMonth: string
}

export function KpiCards({ yearMonth }: KpiCardsProps) {
  const key = `/api/analysis/summary?year_month=${encodeURIComponent(yearMonth)}`
  const { data, error, isLoading } = useSWR<SummaryResponse>(key, () =>
    analysisJsonFetcher<SummaryResponse>(key),
  )

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    )
  }

  const s = data?.summary
  if (!s) {
    return null
  }

  const items: {
    label: string
    value: string | number
    icon: ReactNode
    valueClass?: string
  }[] = [
    {
      label: '対象社員数',
      value: s.total_employees,
      icon: <Users className="h-8 w-8 text-primary" aria-hidden />,
    },
    {
      label: '平均残業時間',
      value: `${s.avg_overtime} h`,
      icon: <Clock className="h-8 w-8 text-slate-600" aria-hidden />,
    },
    {
      label: '36協定違反者数',
      value: s.violation_count,
      icon: <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden />,
      valueClass: 'text-red-600',
    },
    {
      label: '打刻異常件数',
      value: s.anomaly_count,
      icon: <AlertCircle className="h-8 w-8 text-orange-500" aria-hidden />,
      valueClass: 'text-orange-600',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="!p-4">
          <div className="flex items-start gap-3">
            {item.icon}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`truncate text-2xl font-bold text-slate-900 ${item.valueClass ?? ''}`}>
                {item.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
