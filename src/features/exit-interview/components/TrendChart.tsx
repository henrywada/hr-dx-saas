'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyCount } from '@/features/exit-interview/types'

interface Props {
  data: MonthlyCount[]
}

export function TrendChart({ data }: Props) {
  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-[#57606a] text-sm">
        データがありません
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    month: d.year_month.slice(5),
    fullLabel: d.year_month,
    件数: d.count,
    index: i,
  }))

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={(v, i) => {
              const item = chartData[i]
              return item?.fullLabel?.slice(5) === '01' ? `${item.fullLabel.slice(0, 4)}/${v}` : v
            }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(_label, payload) => {
              const item = payload?.[0]?.payload
              return item?.fullLabel ?? _label
            }}
            formatter={(value: number) => [`${value}件`, '退職件数']}
          />
          <Line
            type="monotone"
            dataKey="件数"
            stroke="#0055ff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#0055ff' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
