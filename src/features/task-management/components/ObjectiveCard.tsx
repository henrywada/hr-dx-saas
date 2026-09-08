import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'
import { ProgressRing } from './ProgressRing'

interface ObjectiveCardProps {
  objective: TaskObjective
  /** この目標配下全タスクの進捗率（0-100） */
  progress: number
}

export function ObjectiveCard({ objective, progress }: ObjectiveCardProps) {
  return (
    <Link
      href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
      className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 shadow-xs p-5 hover:bg-[#f6f8fa]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{objective.title}</h3>
        {objective.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{objective.description}</p>
        )}
        {objective.dueDate && (
          <p className="mt-2 text-xs text-slate-400">期限: {objective.dueDate}</p>
        )}
      </div>
      <ProgressRing progress={progress} />
    </Link>
  )
}
