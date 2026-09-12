'use client'

import { useState, useTransition } from 'react'
import {
  createSimpleTask,
  updateTaskBasicInfo,
  addTaskAssignee,
  removeTaskAssignee,
} from '../actions'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'
import { TASK_PRIORITIES, type TaskPriority } from '../types'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

export interface CreatedTask {
  id: string
  title: string
  goalSummary: string | null
  dueDate: string | null
  priority: TaskPriority
  responsibleEmployeeId: string
}

interface SimpleTaskFormProps {
  taskGroupId: string
  managers: EmployeeOption[]
  onClose: () => void
  /** 新規作成時に呼ばれる */
  onCreated?: (task: CreatedTask) => void
  /** 変更保存時に呼ばれる（編集モード） */
  onUpdated?: (task: CreatedTask) => void
  /** 指定時は編集モード（初期値をフォームに流し込む） */
  initialTask?: CreatedTask
}

function formatZodError(err: unknown): string {
  if (err && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: { message: string }[] }).issues
    return issues.map(i => i.message).join('、') || '入力内容を確認してください'
  }
  return err instanceof Error ? err.message : '処理に失敗しました'
}

/** タスクの新規作成／変更モーダル。タスク責任者は is_manager=true の従業員のみ選択できる。 */
export function SimpleTaskForm({
  taskGroupId,
  managers,
  onClose,
  onCreated,
  onUpdated,
  initialTask,
}: SimpleTaskFormProps) {
  const isEdit = Boolean(initialTask)
  const [title, setTitle] = useState(initialTask?.title ?? '')
  const [goalSummary, setGoalSummary] = useState(initialTask?.goalSummary ?? '')
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority ?? 'normal')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(
    initialTask?.responsibleEmployeeId ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (isEdit && initialTask) {
          await updateTaskBasicInfo({
            taskId: initialTask.id,
            title,
            goalSummary: goalSummary || undefined,
            dueDate: dueDate || undefined,
            priority,
          })

          // 責任者が変わった場合は旧責任者を解除してから新責任者を登録する
          // （1タスクにつき responsible は最大1人の UNIQUE 制約があるため）
          if (responsibleEmployeeId !== initialTask.responsibleEmployeeId) {
            await removeTaskAssignee({
              taskId: initialTask.id,
              employeeId: initialTask.responsibleEmployeeId,
            })
            await addTaskAssignee({
              taskId: initialTask.id,
              employeeId: responsibleEmployeeId,
              role: 'responsible',
            })
          }

          onUpdated?.({
            id: initialTask.id,
            title,
            goalSummary: goalSummary || null,
            dueDate: dueDate || null,
            priority,
            responsibleEmployeeId,
          })
        } else {
          const { id } = await createSimpleTask({
            taskGroupId,
            title,
            goalSummary: goalSummary || undefined,
            dueDate: dueDate || undefined,
            priority,
            responsibleEmployeeId,
          })
          onCreated?.({
            id,
            title,
            goalSummary: goalSummary || null,
            dueDate: dueDate || null,
            priority,
            responsibleEmployeeId,
          })
        }
      } catch (err) {
        setError(
          formatZodError(err) ||
            (isEdit ? 'タスクの変更に失敗しました' : 'タスクの登録に失敗しました')
        )
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-lg"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          {isEdit ? 'タスクの変更' : 'タスクの作成'}
        </h2>
        <label className="block text-xs font-medium text-slate-700">
          タスク名
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          タスク目標
          <input
            value={goalSummary}
            onChange={e => setGoalSummary(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          期限
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          優先順
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            {TASK_PRIORITIES.map(p => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700">
          タスク責任者
          <EmployeePicker
            employees={managers}
            value={responsibleEmployeeId}
            onChange={setResponsibleEmployeeId}
            placeholder="責任者を選択"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending || !responsibleEmployeeId}
            className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isEdit ? '変更を保存する' : 'タスクを登録する'}
          </button>
        </div>
      </form>
    </div>
  )
}

export { PRIORITY_LABEL }
