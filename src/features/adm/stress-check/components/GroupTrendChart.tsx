'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { GroupTrendRow } from '../queries'

/** 部署ごとのライン色（最大8部署） */
const DEPARTMENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

interface GroupTrendChartProps {
  trendData: GroupTrendRow[]
  /** 選択中の部署ID（該当ラインを強調） */
  selectedDivisionId?: string | null
}

/**
 * 健康リスクの期間別推移グラフ
 * 部署ごとのライン + 全社平均ラインを表示
 */
export default function GroupTrendChart({
  trendData,
  selectedDivisionId,
}: GroupTrendChartProps) {
  const { chartData, departmentKeys } = useMemo(() => {
    if (trendData.length === 0) {
      return { chartData: [], departmentKeys: [] as { id: string; name: string }[] }
    }

    // 期間を昇順でユニーク取得
    const periodSet = new Set<string>()
    const deptMap = new Map<string, string>() // division_id -> name
    for (const row of trendData) {
      periodSet.add(row.period_name)
      deptMap.set(row.division_id, row.name)
    }
    const periods = Array.from(periodSet).sort()

    const deptList = Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }))

    const chartData = periods.map(period_name => {
      const row: Record<string, string | number> = { period_name }
      let sum = 0
      let count = 0
      for (const { id } of deptList) {
        const r = trendData.find(
          t => t.period_name === period_name && t.division_id === id
        )
        const val = r?.health_risk ?? null
        if (val != null) {
          row[id] = val
          sum += val
          count += 1
        }
      }
      row['_avg'] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0
      return row
    })

    return {
      chartData,
      departmentKeys: deptList,
    }
  }, [trendData])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
        期間データがありません。2期間以上のストレスチェック実施後に推移が表示されます。
      </div>
    )
  }

  if (chartData.length === 1) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
        2期間以上のデータがあると推移グラフが表示されます。
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="period_name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 150]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value: number) => [value, '健康リスク']}
            labelFormatter={label => `期間: ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {/* 平均ライン（破線・グレー） */}
          <Line
            type="monotone"
            dataKey="_avg"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4 }}
            name="全社平均"
          />
          {/* 部署ごとのライン */}
          {departmentKeys.map(({ id, name }, idx) => {
            const isSelected = selectedDivisionId === id
            const color =
              DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length]
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                dot={{ r: isSelected ? 5 : 4 }}
                name={name}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
