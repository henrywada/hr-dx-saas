'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { WORK_LOG_CHART_COLOR } from '../chart-colors'

interface WorkDistributionChartProps {
  data: { id: string; label: string; hours: number }[]
  emptyMessage: string
}

/** 工数分布（メンバー別・タスクグループ別で共用）の横棒グラフ */
export function WorkDistributionChart({ data, emptyMessage }: WorkDistributionChartProps) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400">{emptyMessage}</p>
  }

  // Y軸（カテゴリ軸）は id で一意に区別する。表示名（label）は重複しうる
  // （名前未設定の従業員が複数いる、別マイルストーンに同名グループがある等）ため、
  // dataKey に label を使うと Recharts の scaleBand が同名カテゴリを1本のバンドに
  // 潰してしまい、バーが消える不具合につながる。
  const labelById = new Map(data.map(d => [d.id, d.label]))
  const formatLabel = (id: string) => labelById.get(id) ?? id

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
          <YAxis
            type="category"
            dataKey="id"
            width={100}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickFormatter={formatLabel}
          />
          <Tooltip
            formatter={(value: number) => [`${value}時間`, '工数']}
            labelFormatter={formatLabel}
          />
          <Bar dataKey="hours" fill={WORK_LOG_CHART_COLOR} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
