'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ReasonCount } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS, MAIN_REASON_COLORS } from '@/features/exit-interview/types'

interface Props {
  data: ReasonCount[]
}

export function ReasonDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        データがありません
      </div>
    )
  }

  const chartData = data
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      name: MAIN_REASON_LABELS[d.reason],
      count: d.count,
      color: MAIN_REASON_COLORS[d.reason],
    }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [`${value}件`, '件数']} />
          <Bar dataKey="count" radius={4}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
