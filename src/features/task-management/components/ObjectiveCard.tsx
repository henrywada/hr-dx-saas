import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'

interface ObjectiveCardProps {
  objective: TaskObjective
}

export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  return (
    <Link
      href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
      className="block bg-white rounded-lg border border-slate-200 shadow-xs p-5 hover:bg-[#f6f8fa]"
    >
      <h3 className="text-sm font-semibold text-slate-900">{objective.title}</h3>
      {objective.description && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{objective.description}</p>
      )}
      {objective.dueDate && (
        <p className="mt-2 text-xs text-slate-400">期限: {objective.dueDate}</p>
      )}
    </Link>
  )
}
