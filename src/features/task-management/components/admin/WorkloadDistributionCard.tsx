'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WorkloadRow } from '../../queries'

interface WorkloadDistributionCardProps {
  workload: WorkloadRow[]
}

/** 担当者別の担当タスク件数・進行中件数を横棒グラフで表示するカード */
export function WorkloadDistributionCard({ workload }: WorkloadDistributionCardProps) {
  // 上位20名に絞る（テナント規模が大きい場合にグラフが縦に伸びすぎないようにするため）
  const data = workload.slice(0, 20)
  const labelById = new Map(data.map(d => [d.employeeId, d.employeeName]))
  const formatLabel = (id: string) => labelById.get(id) ?? id

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">担当者別負荷（上位{data.length}名）</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">担当タスクを持つ従業員がいません。</p>
      ) : (
        <div className="mt-3 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="employeeId"
                width={100}
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={formatLabel}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}件`,
                  name === 'totalCount' ? '担当件数' : '進行中件数',
                ]}
                labelFormatter={formatLabel}
              />
              <Bar dataKey="totalCount" fill="#94a3b8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="inProgressCount" fill="#FD7601" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
