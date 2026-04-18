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
import type { PeriodTrendPoint } from '@/features/questionnaire/types'

interface Props {
  data: PeriodTrendPoint[]
  questionText: string
}

export default function PeriodTrendChart({ data, questionText }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        集計データがありません
      </div>
    )
  }

  const chartData = data.map(point => ({
    name: point.label,
    平均スコア: point.avg_score !== null ? Math.round(point.avg_score * 10) / 10 : null,
    回答者数: point.response_count,
  }))

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 font-medium">{questionText}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="score" domain={[0, 5]} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="平均スコア"
            stroke="#0055ff"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="回答者数"
            stroke="#00c2b8"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
