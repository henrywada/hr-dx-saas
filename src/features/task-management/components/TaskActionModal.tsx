'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateTaskStatus,
  updateTaskProgress,
  addTaskAssignee,
  removeTaskAssignee,
} from '../actions'
import { TASK_STATUSES, type Task } from '../types'
import { CommentThread } from './CommentThread'
import { WorkLogSection } from './WorkLogSection'
import { DivisionFilteredEmployeePicker } from './DivisionFilteredEmployeePicker'
import type { EmployeeOption } from '../employee-filter'
import type { DivisionOption } from '../queries'

export type TaskActionSection = 'status' | 'workLog' | 'comment' | 'members'

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const SECTION_TITLE: Record<TaskActionSection, string> = {
  status: '進捗ステータス',
  workLog: '工数記録',
  comment: 'コメント投稿',
  members: 'メンバー登録',
}

interface TaskActionModalProps {
  task: Task
  section: TaskActionSection
  onClose: () => void
  currentEmployeeId: string | null
  canModerateComments: boolean
  canPostComment: boolean
  canLogWork: boolean
  canOperateStatus: boolean
  canManageAssignees: boolean
  assignableEmployees: EmployeeOption[]
  adviceTargets: EmployeeOption[]
  suggestionTargets: EmployeeOption[]
  reportTargets: EmployeeOption[]
  /** 「コメント」区分の宛先（目標責任者・タスクメンバー） */
  generalTargets: EmployeeOption[]
  employeeNameById: Record<string, string>
  divisions: DivisionOption[]
  employeeDivisionById: Record<string, string | null>
  /** 開いたときにこのコメントへの返信フォームを自動表示する */
  initialReplyToCommentId?: string | null
}

/** タスク詳細の各機能を分割表示するモーダル（進捗／工数／コメント／メンバー） */
export function TaskActionModal({
  task,
  section,
  onClose,
  currentEmployeeId,
  canModerateComments,
  canPostComment,
  canLogWork,
  canOperateStatus,
  canManageAssignees,
  assignableEmployees,
  adviceTargets,
  suggestionTargets,
  reportTargets,
  generalTargets,
  employeeNameById,
  divisions,
  employeeDivisionById,
  initialReplyToCommentId = null,
}: TaskActionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingAssigneeId, setPendingAssigneeId] = useState('')
  // 進捗ステータスはローカル編集 →「登録する」で一括保存
  const [draftStatus, setDraftStatus] = useState<Task['status']>(task.status)
  const [draftProgress, setDraftProgress] = useState(task.progressPercent)

  function clampProgress(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  function adjustProgress(delta: number) {
    setDraftProgress(prev => clampProgress(prev + delta))
  }

  function handleRegisterStatus() {
    if (!canOperateStatus) return
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: draftStatus })
        await updateTaskProgress({ taskId: task.id, progressPercent: draftProgress })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : '進捗ステータスの登録に失敗しました')
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
        className={`max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg ${
          section === 'members' ? 'min-h-[520px]' : ''
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{SECTION_TITLE[section]}</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              <span className="text-slate-500">タスク名：</span>
              {task.title}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        {section === 'status' && (
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              ステータス
              <select
                value={draftStatus}
                onChange={e => setDraftStatus(e.target.value as Task['status'])}
                disabled={isPending || !canOperateStatus}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              >
                {TASK_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">進捗率: {draftProgress}%</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustProgress(-5)}
                    disabled={isPending || !canOperateStatus || draftProgress <= 0}
                    className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-50"
                    aria-label="進捗率を5%下げる"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustProgress(5)}
                    disabled={isPending || !canOperateStatus || draftProgress >= 100}
                    className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-50"
                    aria-label="進捗率を5%上げる"
                  >
                    ▶
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={draftProgress}
                onChange={e => setDraftProgress(clampProgress(Number(e.target.value)))}
                disabled={isPending || !canOperateStatus}
                className="mt-1 w-full"
              />
            </div>
            {canOperateStatus && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRegisterStatus}
                  disabled={isPending}
                  className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  登録する
                </button>
              </div>
            )}
          </div>
        )}

        {section === 'workLog' && (
          <div className="mt-3">
            <WorkLogSection
              taskId={task.id}
              canLogWork={canLogWork}
              currentEmployeeId={currentEmployeeId}
            />
          </div>
        )}

        {section === 'comment' && (
          <div className="mt-3">
            <CommentThread
              target={{ taskId: task.id }}
              canPost={canPostComment}
              currentEmployeeId={currentEmployeeId}
              canModerate={canModerateComments}
              adviceTargets={adviceTargets}
              suggestionTargets={suggestionTargets}
              reportTargets={reportTargets}
              generalTargets={generalTargets}
              initialReplyToCommentId={initialReplyToCommentId}
            />
          </div>
        )}

        {section === 'members' && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-700">
              メンバー：{task.assigneeEmployeeIds.length}名
            </p>
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
              // 氏名検索ドロップダウン（max-h-48）がモーダル下端で切れないよう余白を確保
              <div className="mt-3 border-t border-slate-200 pt-3 pb-52">
                <DivisionFilteredEmployeePicker
                  employees={assignableEmployees.filter(
                    e => !task.assigneeEmployeeIds.includes(e.id)
                  )}
                  employeeDivisionById={employeeDivisionById}
                  divisions={divisions}
                  value={pendingAssigneeId}
                  onChange={setPendingAssigneeId}
                  action={
                    <button
                      type="button"
                      onClick={handleAddAssignee}
                      disabled={isPending || !pendingAssigneeId}
                      className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50"
                    >
                      追加
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
