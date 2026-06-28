'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { DivisionConditionTrendPoint, DivisionOption } from '../types'

interface Props {
  data: DivisionConditionTrendPoint[]
  divisionOptions?: DivisionOption[]
  selectedDivisionId?: string
}

const MIN_RESPONDENTS = 5

export function DivisionConditionTrendView({ data, divisionOptions, selectedDivisionId }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const chartData = data.map(point => ({
    name: point.checkin_date.slice(5).replace('-', '/'),
    avgScore: point.avg_score,
    respondentCount: point.respondent_count,
  }))

  const hasAnyVisibleAverage = data.some(point => point.avg_score !== null)

  return (
    <div className="space-y-3">
      {divisionOptions && divisionOptions.length > 0 && (
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-(--brand) min-w-[10rem]"
          value={selectedDivisionId ?? ''}
          onChange={e => router.push(`${pathname}?divisionId=${e.target.value}`)}
        >
          {divisionOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      )}

      {!hasAnyVisibleAverage ? (
        <div className="flex items-center justify-center h-[240px] text-slate-400 text-sm">
          回答者数が{MIN_RESPONDENTS}名未満のため、匿名性保護の観点から非表示です
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="score"
              domain={[1, 5]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e6ec', fontSize: '12px' }}
              formatter={(value: number, name: string) => [
                value === null ? '—（人数不足）' : value,
                name === 'avgScore' ? '平均スコア' : '回答者数',
              ]}
            />
            <Area
              yAxisId="count"
              type="monotone"
              dataKey="respondentCount"
              name="respondentCount"
              fill="#e0f2fe"
              stroke="#7dd3fc"
              fillOpacity={0.5}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="avgScore"
              name="avgScore"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
