'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TASK_STATUSES, type Task, type TaskStatus } from '../types'

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

interface TaskStatusDonutChartProps {
  tasks: Task[]
}

/** タスクのステータス分布をドーナツグラフで表示する */
export function TaskStatusDonutChart({ tasks }: TaskStatusDonutChartProps) {
  const data = TASK_STATUSES.map(status => ({
    status,
    label: STATUS_LABEL[status],
    value: tasks.filter(t => t.status === status).length,
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return <p className="text-xs text-slate-500">タスクがまだありません。</p>
  }

  return (
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
  )
}
