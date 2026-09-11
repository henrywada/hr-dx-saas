'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateTaskStatus,
  updateTaskProgress,
  updateTaskBasicInfo,
  addTaskAssignee,
  removeTaskAssignee,
} from '../actions'
import { TASK_STATUSES, type Task } from '../types'
import { CommentThread } from './CommentThread'
import { WorkLogSection } from './WorkLogSection'
import { DivisionFilteredEmployeePicker } from './DivisionFilteredEmployeePicker'
import type { EmployeeOption } from '../employee-filter'
import type { DivisionOption } from '../queries'

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
  /** 担当者の追加・解除を行えるか（責任者/マネージャー。task_assigneesのRLSが最終防衛） */
  canManageAssignees: boolean
  /** 担当者候補（そのタスクグループのマネージャー・メンバー） */
  assignableEmployees: EmployeeOption[]
  /** 閲覧者が助言を送信できる相手（KanbanBoard経由でページから配線） */
  adviceTargets: EmployeeOption[]
  /**
   * 閲覧者が提案を送信できる相手（ObjectiveTaskBoard経由でページから配線）。
   * KanbanBoard（/tasks/groups/[id]、Phase5対象外）は未配線のため省略可（既定は空配列）。
   */
  suggestionTargets?: EmployeeOption[]
  /**
   * 閲覧者が報告を送信できる相手（ObjectiveTaskBoard経由でページから配線）。
   * KanbanBoard（/tasks/groups/[id]、Phase5対象外）は未配線のため省略可（既定は空配列）。
   */
  reportTargets?: EmployeeOption[]
  /**
   * 従業員ID→氏名のテナント全体マップ（TaskCard.tsxと同じ用途）。
   * assignableEmployeesはグループの現マネージャー・メンバーに限定されるため、
   * 既にグループを離脱した担当者の名前解決に使えない（生のUUIDが表示されてしまう）。
   * 最終ブランチレビュー M1 対応。
   */
  employeeNameById: Record<string, string>
  /**
   * 担当者追加を組織階層で絞り込むための組織一覧（DivisionFilteredEmployeePicker用）。
   * KanbanBoard（/tasks/groups/[id]、Phase5対象外）は未配線のため省略可（既定は絞り込みなし）。
   */
  divisions?: DivisionOption[]
  /** 担当者追加を組織階層で絞り込むための従業員ID→所属division_idマップ（同上、省略可） */
  employeeDivisionById?: Record<string, string | null>
  /** タスクの基本情報（タスク名・タスク目標・期限）を編集できるか（責任者/マネージャー、省略時false） */
  canEditBasicInfo?: boolean
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  canOperate,
  currentEmployeeId,
  canModerateComments,
  canLogWork,
  canManageAssignees,
  assignableEmployees,
  adviceTargets,
  suggestionTargets = [],
  reportTargets = [],
  employeeNameById,
  divisions = [],
  employeeDivisionById = {},
  canEditBasicInfo = false,
}: TaskDetailModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingAssigneeId, setPendingAssigneeId] = useState('')

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

  function handleAddAssignee() {
    if (!pendingAssigneeId) return
    setError(null)
    startTransition(async () => {
      try {
        await addTaskAssignee({ taskId: task.id, employeeId: pendingAssigneeId, role: 'member' })
        setPendingAssigneeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '担当者の追加に失敗しました')
      }
    })
  }

  function handleRemoveAssignee(employeeId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeTaskAssignee({ taskId: task.id, employeeId })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '担当者の解除に失敗しました')
      }
    })
  }

  function assigneeName(id: string): string {
    return employeeNameById[id] ?? id
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

        {canEditBasicInfo && <BasicInfoEditForm task={task} />}

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
          <div>
            <dt className="text-[10px] text-slate-400">作成者</dt>
            <dd>{assigneeName(task.createdByEmployeeId)}</dd>
          </div>
        </dl>

        {task.goalSummary && (
          <p className="mt-2 text-xs text-slate-600">
            <span className="text-[10px] text-slate-400">目標: </span>
            {task.goalSummary}
          </p>
        )}

        <div className="mt-3">
          <p className="text-xs font-medium text-slate-700">担当者</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {task.assigneeEmployeeIds.length === 0 && (
              <li className="text-[10px] text-slate-400">未割当</li>
            )}
            {task.assigneeEmployeeIds.map(id => (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
              >
                {assigneeName(id)}
                {canManageAssignees && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignee(id)}
                    disabled={isPending}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canManageAssignees && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-56">
                <DivisionFilteredEmployeePicker
                  employees={assignableEmployees.filter(
                    e => !task.assigneeEmployeeIds.includes(e.id)
                  )}
                  employeeDivisionById={employeeDivisionById}
                  divisions={divisions}
                  value={pendingAssigneeId}
                  onChange={setPendingAssigneeId}
                />
              </div>
              <button
                type="button"
                onClick={handleAddAssignee}
                disabled={isPending || !pendingAssigneeId}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          )}
        </div>

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
            adviceTargets={adviceTargets}
            suggestionTargets={suggestionTargets}
            reportTargets={reportTargets}
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

function BasicInfoEditForm({ task }: { task: Task }) {
  const router = useRouter()
  const [title, setTitle] = useState(task.title)
  const [goalSummary, setGoalSummary] = useState(task.goalSummary ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskBasicInfo({
          taskId: task.id,
          title,
          goalSummary: goalSummary || undefined,
          dueDate: dueDate || undefined,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      <input
        value={goalSummary}
        onChange={e => setGoalSummary(e.target.value)}
        placeholder="タスク目標"
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      {error && <p className="text-[10px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
      >
        保存
      </button>
    </form>
  )
}
