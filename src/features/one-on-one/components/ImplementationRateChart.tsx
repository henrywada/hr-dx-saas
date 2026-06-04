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
import type { ImplementationRateRow } from '../types'

interface Props {
  data: ImplementationRateRow[]
}

function getRateColor(rate: number): string {
  if (rate >= 80) return '#22c55e'
  if (rate >= 50) return '#f59e0b'
  return '#ef4444'
}

export function ImplementationRateChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データなし — 管理職（is_manager = true）の従業員登録が必要です
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: d.manager_name.length > 8 ? d.manager_name.slice(0, 7) + '…' : d.manager_name,
    fullName: d.manager_name,
    rate: d.rate,
    dept: d.department_name ?? '',
    sessions: d.sessions_last_30days,
    total: d.total_subordinates,
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
            `${value}%（${props.payload.sessions}/${props.payload.total}名）`,
            '実施率（直近30日）',
          ]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getRateColor(entry.rate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
