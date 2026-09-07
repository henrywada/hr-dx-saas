'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatus, updateTaskProgress } from '../actions'
import { TASK_STATUSES, type Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Task['status']
    startTransition(async () => {
      await updateTaskStatus({ taskId: task.id, status })
      router.refresh()
    })
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progressPercent = Number(e.target.value)
    startTransition(async () => {
      await updateTaskProgress({ taskId: task.id, progressPercent })
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <select
        value={task.status}
        onChange={handleStatusChange}
        disabled={isPending}
        className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
      >
        {TASK_STATUSES.map(status => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={100}
        value={task.progressPercent}
        onChange={handleProgressChange}
        disabled={isPending}
        className="mt-2 w-full"
      />
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
    </div>
  )
}
