'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { DivisionAchievementRow } from '../types'

interface Props {
  data: DivisionAchievementRow[]
}

function getBarColor(progress: number): string {
  if (progress >= 70) return '#22c55e'
  if (progress >= 40) return '#f59e0b'
  return '#ef4444'
}

export function AchievementRateChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データなし — 部門目標を登録すると達成率が表示されます
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: d.division_name.length > 8 ? d.division_name.slice(0, 7) + '…' : d.division_name,
    fullName: d.division_name,
    progress: d.avg_progress,
    count: d.objective_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip
          formatter={(value, _, props) => [
            `${value}%（目標${props.payload.count}件）`,
            '平均達成率',
          ]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
        />
        <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getBarColor(entry.progress)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
