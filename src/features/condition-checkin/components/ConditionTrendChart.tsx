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
import type { ConditionTrendPoint } from '../types'
import { SCORE_LABEL } from '../labels'

interface Props {
  data: ConditionTrendPoint[]
}

export function ConditionTrendChart({ data }: Props) {
  if (data.every(point => point.score === null)) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm py-12">
        まだ記録がありません
      </div>
    )
  }

  const chartData = data.map(point => ({
    name: point.checkin_date.slice(5).replace('-', '/'),
    score: point.score,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [value !== null ? SCORE_LABEL[value] : '記録なし', '体調']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e6ec', fontSize: '12px' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981' }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
