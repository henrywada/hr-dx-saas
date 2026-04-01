// 事前に npm install recharts を実行してください（プロジェクトに含まれている場合は不要です）
'use client'

import useSWR from 'swr'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TrendItem } from '@/app/api/analysis/trend/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type TrendResponse = { trend: TrendItem[] }

type OvertimeTrendChartProps = {
  yearMonth: string
}

export function OvertimeTrendChart({ yearMonth }: OvertimeTrendChartProps) {
  const swrKey = ['analysis-trend', yearMonth] as const
  const { data, error, isLoading } = useSWR<TrendResponse>(swrKey, () =>
    analysisJsonFetcher<TrendResponse>('/api/analysis/trend'),
  )

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    )
  }

  const rows = data?.trend ?? []
  const chartData = rows.map((r) => ({
    ...r,
    ym: r.year_month.length >= 7 ? r.year_month.slice(0, 7) : r.year_month,
  }))

  return (
    <Card title="月次トレンド（過去12ヶ月）" className="!p-4">
      <div className="h-72 w-full min-w-0 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" h" />
            <Tooltip
              formatter={(v: number | undefined, name: string | undefined) => [
                v !== undefined ? `${v} h` : '',
                name === 'avg_overtime' ? '平均残業' : name === 'max_overtime' ? '最大残業' : name,
              ]}
            />
            <Legend
              formatter={(value) =>
                value === 'avg_overtime' ? '平均残業' : value === 'max_overtime' ? '最大残業' : value
              }
            />
            <ReferenceLine
              y={45}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: '45h', fill: '#b91c1c', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="avg_overtime"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="avg_overtime"
            />
            <Line
              type="monotone"
              dataKey="max_overtime"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="max_overtime"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
