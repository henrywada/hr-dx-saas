'use client'

import { useState, useTransition } from 'react'
import { createSimpleTask } from '../actions'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface CreatedTask {
  id: string
  title: string
  goalSummary: string | null
  responsibleEmployeeId: string
}

interface SimpleTaskFormProps {
  taskGroupId: string
  managers: EmployeeOption[]
  onClose: () => void
  onCreated: (task: CreatedTask) => void
}

/** タスクの新規作成モーダル。タスク責任者は is_manager=true の従業員のみ選択できる。 */
export function SimpleTaskForm({ taskGroupId, managers, onClose, onCreated }: SimpleTaskFormProps) {
  const [title, setTitle] = useState('')
  const [goalSummary, setGoalSummary] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createSimpleTask({
          taskGroupId,
          title,
          goalSummary: goalSummary || undefined,
          dueDate: dueDate || undefined,
          responsibleEmployeeId,
        })
        onCreated({ id, title, goalSummary: goalSummary || null, responsibleEmployeeId })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの登録に失敗しました')
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
        <h2 className="text-sm font-semibold text-slate-900">タスクの作成</h2>
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
            タスクを登録する
          </button>
        </div>
      </form>
    </div>
  )
}
