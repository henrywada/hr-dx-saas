'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PulseTrendPoint, StressTrendPoint, QuestionnaireTrendPoint } from '../types'

interface Props {
  pulseTrend: PulseTrendPoint[]
  stressTrend: StressTrendPoint[]
  questionnaireTrend: QuestionnaireTrendPoint[]
}

interface ChartRow {
  label: string
  pulse?: number
  highStress?: number
  questResponse?: number
}

export function MonthlyTrendChart({ pulseTrend, stressTrend, questionnaireTrend }: Props) {
  const labelSet = new Map<string, ChartRow>()

  for (const p of pulseTrend) {
    const row = labelSet.get(p.label) ?? { label: p.label }
    row.pulse = p.score
    labelSet.set(p.label, row)
  }
  for (const s of stressTrend) {
    const lbl = s.periodTitle
    const row = labelSet.get(lbl) ?? { label: lbl }
    row.highStress = s.highStressRate
    labelSet.set(lbl, row)
  }
  for (const q of questionnaireTrend) {
    const lbl = q.periodLabel
    const row = labelSet.get(lbl) ?? { label: lbl }
    row.questResponse = q.responseRate
    labelSet.set(lbl, row)
  }

  const chartData = Array.from(labelSet.values())

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">データなし</div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="pulse"
          domain={[0, 5]}
          tick={{ fontSize: 11 }}
          label={{ value: 'スコア', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 10 }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'パルスサーベイ') return [`${value.toFixed(1)}`, name]
            return [`${value}%`, name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="pulse"
          type="monotone"
          dataKey="pulse"
          name="パルスサーベイ"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="highStress"
          name="高ストレス率"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="questResponse"
          name="アンケート回答率"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
