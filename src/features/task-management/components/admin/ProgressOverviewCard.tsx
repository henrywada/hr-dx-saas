'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TASK_STATUSES, type TaskStatus } from '../../types'
import type { TaskHealthOverview } from '../../queries'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#FD7601',
  review: '#eab308',
  done: '#1a8754',
  blocked: '#ef4444',
}

interface ProgressOverviewCardProps {
  overview: TaskHealthOverview
}

/** テナント全体のタスクステータス分布・平均進捗率を表示するカード */
export function ProgressOverviewCard({ overview }: ProgressOverviewCardProps) {
  const data = TASK_STATUSES.map(status => ({
    status,
    label: STATUS_LABEL[status],
    value: overview.statusCounts[status],
  })).filter(d => d.value > 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">進捗概要</h2>
        <p className="text-xs text-slate-500">
          全{overview.totalCount}件・平均進捗{overview.averageProgress}%
        </p>
      </div>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">対象のタスクがありません。</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80}>
              {data.map(d => (
                <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
