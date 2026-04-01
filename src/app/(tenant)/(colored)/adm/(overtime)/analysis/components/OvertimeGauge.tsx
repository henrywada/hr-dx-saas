// 事前に npm install recharts を実行してください（プロジェクトに含まれている場合は不要です）
'use client'

import useSWR from 'swr'
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { SummaryKPI } from '@/app/api/analysis/summary/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type SummaryResponse = { summary: SummaryKPI }

type OvertimeGaugeProps = {
  yearMonth: string
}

const CAP_GENERAL = 45
const CAP_SPECIAL = 100

function gaugeColor(usagePercent: number): string {
  if (usagePercent <= 60) return '#22c55e'
  if (usagePercent <= 80) return '#f59e0b'
  return '#ef4444'
}

/** 時間を HH:MM 表記（45:00 = 45時間00分） */
function formatHoursClock(hours: number): string {
  const totalMin = Math.round(hours * 60)
  const hh = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

type GaugeBlockProps = {
  title: string
  capHours: number
  hours: number
}

function GaugeBlock({ title, capHours, hours }: GaugeBlockProps) {
  const pct = Math.min((hours / capHours) * 100, 100)
  const fill = gaugeColor(pct)
  const data = [{ name: 'usage', value: pct, fill }]

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <p className="text-center text-sm font-medium text-slate-600">{title}</p>
      <div className="relative h-52 w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#e2e8f0' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1">
          <span className="text-center text-sm font-semibold tabular-nums text-slate-800">
            {formatHoursClock(hours)} / {formatHoursClock(capHours)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function OvertimeGauge({ yearMonth }: OvertimeGaugeProps) {
  const key = `/api/analysis/summary?year_month=${encodeURIComponent(yearMonth)}`
  const { data, error, isLoading } = useSWR<SummaryResponse>(key, () =>
    analysisJsonFetcher<SummaryResponse>(key),
  )

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-3xl" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    )
  }

  const hours = data?.summary.avg_overtime ?? 0

  return (
    <Card title="36協定 使用率（平均残業ベース）" className="!p-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-center md:gap-10">
        <GaugeBlock title="36一般時間（月45h上限）" capHours={CAP_GENERAL} hours={hours} />
        <GaugeBlock title="36特別時間（月100h上限）" capHours={CAP_SPECIAL} hours={hours} />
      </div>
    </Card>
  )
}
