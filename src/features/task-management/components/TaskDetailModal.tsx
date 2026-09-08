'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatus, updateTaskProgress } from '../actions'
import { TASK_STATUSES, type Task } from '../types'
import { CommentThread } from './CommentThread'
import { WorkLogSection } from './WorkLogSection'

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

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  /** ステータス・進捗編集を行えるか（責任者/マネージャー/担当者本人。RLSが最終防衛） */
  canOperate: boolean
  /** 閲覧者本人の従業員ID（コメント編集可否の判定に使う） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerateComments: boolean
  /** 閲覧者が自分の工数を記録できるか（グループ参加者または担当者本人。RLSが最終防衛） */
  canLogWork: boolean
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  canOperate,
  currentEmployeeId,
  canModerateComments,
  canLogWork,
}: TaskDetailModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Task['status']
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
      }
    })
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progressPercent = Number(e.target.value)
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskProgress({ taskId: task.id, progressPercent })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '進捗率の更新に失敗しました')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{task.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        {task.description && <p className="mt-2 text-xs text-slate-600">{task.description}</p>}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <dt className="text-[10px] text-slate-400">優先度</dt>
            <dd>{PRIORITY_LABEL[task.priority]}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-400">期限</dt>
            <dd>{task.dueDate ?? '未設定'}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <label className="text-xs font-medium text-slate-700">
            ステータス
            <select
              value={task.status}
              onChange={handleStatusChange}
              disabled={isPending || !canOperate}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            >
              {TASK_STATUSES.map(status => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-medium text-slate-700">
            進捗率: {task.progressPercent}%
            <input
              type="range"
              min={0}
              max={100}
              value={task.progressPercent}
              onChange={handleProgressChange}
              disabled={isPending || !canOperate}
              className="mt-1 w-full"
            />
          </label>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-900">コメント</h3>
          <CommentThread
            target={{ taskId: task.id }}
            canPost={canOperate}
            currentEmployeeId={currentEmployeeId}
            canModerate={canModerateComments}
          />
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-900">工数記録</h3>
          <WorkLogSection
            taskId={task.id}
            canLogWork={canLogWork}
            currentEmployeeId={currentEmployeeId}
          />
        </div>
      </div>
    </div>
  )
}
