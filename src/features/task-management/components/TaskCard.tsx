'use client'

import { useState, useTransition } from 'react'
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
  /** 閲覧者本人の従業員ID（従業員レコード無しユーザーは null） */
  myEmployeeId: string | null
  /** 閲覧者がこのタスクグループの責任者またはマネージャーか（全タスクを操作可能） */
  canOperateAllTasks: boolean
}

/**
 * タスクの状態・進捗率の編集コントロール。
 * データ自体（タイトル・優先度・状態・進捗率）はグループ参加者全員に見える
 * （PRDの透明性重視の設計）。編集操作のみ、責任者/マネージャー/担当者本人に制限する。
 * RLS が最終防衛線として担保するが、UI側でも権限外の操作を disabled にし、
 * かつ RLS 拒否時（0件更新）はエラーを表示する（最終レビュー Finding 1-3）。
 */
export function TaskCard({ task, myEmployeeId, canOperateAllTasks }: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canOperate = canOperateAllTasks || task.assigneeEmployeeId === myEmployeeId

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
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <select
        value={task.status}
        onChange={handleStatusChange}
        disabled={isPending || !canOperate}
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
        disabled={isPending || !canOperate}
        className="mt-2 w-full"
      />
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
