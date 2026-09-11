import Link from 'next/link'
import { Target } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'
import { ProgressRing } from './ProgressRing'

interface ObjectiveCardProps {
  objective: TaskObjective
  /** この目標配下全タスクの進捗率（0-100） */
  progress: number
  /** 従業員ID→氏名のマップ（作成者名の表示に使う） */
  employeeNameById: Record<string, string>
}

export function ObjectiveCard({ objective, progress, employeeNameById }: ObjectiveCardProps) {
  return (
    <Link
      href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
      className="block bg-white rounded-lg border border-slate-200 shadow-xs hover:bg-[#f6f8fa]"
    >
      <h3 className="flex items-center gap-1.5 truncate border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
        <Target className="h-4 w-4 shrink-0 text-[#FD7601]" strokeWidth={2} />
        <span className="truncate">{objective.title}</span>
      </h3>
      <div className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          {objective.description && (
            <p className="text-xs text-slate-500 line-clamp-2">{objective.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {objective.dueDate && (
              <span className="inline-flex items-center rounded-full bg-(--success-bg) px-2 py-0.5 text-[10px] font-bold text-(--green-600)">
                期限: {objective.dueDate}
              </span>
            )}
            <span>
              作成者: {employeeNameById[objective.ownerEmployeeId] ?? objective.ownerEmployeeId}
            </span>
            <span>作成日: {objective.createdAt.slice(0, 10)}</span>
          </div>
        </div>
        <ProgressRing progress={progress} />
      </div>
    </Link>
  )
}
