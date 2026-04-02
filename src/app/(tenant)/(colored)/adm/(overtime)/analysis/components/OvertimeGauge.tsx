// 事前に npm install recharts を実行してください（プロジェクトに含まれている場合は不要です）
'use client'

import useSWR from 'swr'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { SummaryKPI } from '@/app/api/analysis/summary/route'
import { AnalysisCardHeaderRow } from './AnalysisCardHeaderRow'
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

/**
 * 円内の HH:MM と同じ値になるよう分単位で丸めた時間（h）。
 * API の小数第2位だけだと 6.69h と 06:41（≈6.683h）のように食い違うため表示を統一する。
 */
function alignHoursToClockMinutes(hours: number): number {
  return Math.round(hours * 60) / 60
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
            {/* 使用率 0〜100% を全周にマッピング（未指定だと単一データが常に全周塗りになる） */}
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
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
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title="36協定 使用率（平均残業ベース）" yearMonth={yearMonth} />
        <Skeleton className="h-52 w-full max-w-3xl md:h-64" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title="36協定 使用率（平均残業ベース）" yearMonth={yearMonth} />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      </Card>
    )
  }

  const s = data?.summary
  const empN = s?.employee_count ?? 0
  const totalHRaw = s?.total_overtime_hours ?? 0
  const avgRaw = s?.avg_overtime ?? 0

  // 人数0のときは平均・合計も 0 表示（キャッシュ等で不整合が出ないよう防御）
  const totalH = empN === 0 ? 0 : totalHRaw
  const hoursForGauge = empN === 0 ? 0 : alignHoursToClockMinutes(avgRaw)

  return (
    <Card className="!p-4">
      <AnalysisCardHeaderRow title="36協定 使用率（平均残業ベース）" yearMonth={yearMonth} />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-center md:gap-10">
        <GaugeBlock title="原則の目安（月45h）" capHours={CAP_GENERAL} hours={hoursForGauge} />
        <GaugeBlock title="特別条項の目安（月100h）" capHours={CAP_SPECIAL} hours={hoursForGauge} />
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500 sm:text-xs">
        左は上限規制でいう時間外労働の原則目安（月45時間）、右は特別条項の議論で用いられる月100時間（時間外労働と休日労働の合算等、法令で定める定義）の目安です。本システムの集計は主に時間外実績に基づくため、休日労働を含まない場合は法令上の数値と一致しません。
      </p>
      <p className="mt-4 text-center text-xs text-slate-500 tabular-nums sm:text-sm">
        残業時間（{totalH} h）/ 従業員数（{empN} 名）= {formatHoursClock(hoursForGauge)}（平均）
      </p>
    </Card>
  )
}
