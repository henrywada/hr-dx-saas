import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-[#FD7601]"
          style={{ width: `${task.progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
    </div>
  )
}
