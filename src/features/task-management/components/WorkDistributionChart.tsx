'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getChartColor } from '../chart-colors'

interface WorkDistributionChartProps {
  data: { label: string; hours: number }[]
  emptyMessage: string
}

/** 工数分布（メンバー別・タスクグループ別で共用）の横棒グラフ */
export function WorkDistributionChart({ data, emptyMessage }: WorkDistributionChartProps) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400">{emptyMessage}</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip formatter={(value: number) => [`${value}時間`, '工数']} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={getChartColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
