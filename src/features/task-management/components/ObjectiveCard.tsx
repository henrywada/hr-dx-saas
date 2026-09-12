'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Target } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'
import { ProgressRing } from './ProgressRing'
import { ObjectiveEditModal } from './ObjectiveEditModal'
import { deleteObjective } from '../actions'

interface ObjectiveCardProps {
  objective: TaskObjective
  /** この目標配下全タスクの進捗率（0-100） */
  progress: number
  /** 従業員ID→氏名のマップ（作成者名の表示に使う） */
  employeeNameById: Record<string, string>
  /**
   * 目標責任者、または配下タスクの責任者のとき true。
   * フッター右寄せの「目標編集」「タスク編集」「削除」を表示する。
   */
  canManage: boolean
}

export function ObjectiveCard({
  objective,
  progress,
  employeeNameById,
  canManage,
}: ObjectiveCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    // Link への遷移を防ぐ
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('この目標と配下のタスクを削除しますか？この操作は取り消せません。')) {
      return
    }
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteObjective({ objectiveId: objective.id })
        router.refresh()
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : '目標の削除に失敗しました')
      }
    })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs">
      <Link
        href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
        className="block hover:bg-[#f6f8fa] rounded-t-lg"
      >
        <h3 className="flex items-center gap-1.5 truncate border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          <Target className="h-4 w-4 shrink-0 text-[#FD7601]" strokeWidth={2} />
          <span className="truncate">{objective.title}</span>
        </h3>
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0 flex-1">
            {objective.description && (
              <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">
                {objective.description}
              </p>
            )}
            {objective.dueDate && (
              <div className={objective.description ? 'mt-2' : undefined}>
                <span className="inline-flex items-center rounded-full bg-(--success-bg) px-3 py-1 text-sm font-bold text-(--green-600)">
                  期限: {objective.dueDate}
                </span>
              </div>
            )}
          </div>
          <ProgressRing progress={progress} />
        </div>
      </Link>

      {/* フッター: 左に作成者・作成日、右に目標編集・タスク編集・削除（権限がある場合） */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>
            作成者: {employeeNameById[objective.ownerEmployeeId] ?? objective.ownerEmployeeId}
          </span>
          <span>作成日: {objective.createdAt.slice(0, 10)}</span>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setIsEditOpen(true)
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-[#f6f8fa]"
            >
              目標編集
            </button>
            <Link
              href={APP_ROUTES.tasks.objectiveEdit(objective.id)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-[#f6f8fa]"
              onClick={e => e.stopPropagation()}
            >
              タスク編集
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}
      </div>
      {deleteError && (
        <p className="border-t border-slate-200 px-5 py-2 text-xs text-red-600">{deleteError}</p>
      )}
      {isEditOpen && (
        <ObjectiveEditModal objective={objective} onClose={() => setIsEditOpen(false)} />
      )}
    </div>
  )
}
