'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '../actions'
import { TASK_PRIORITIES, type TaskPriority } from '../types'
import { MultiEmployeePicker } from './MultiEmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface TaskFormProps {
  taskGroupId: string
  /** 担当者として選択できる従業員（そのタスクグループのマネージャー・メンバーのみ） */
  assignableEmployees: EmployeeOption[]
}

export function TaskForm({ taskGroupId, assignableEmployees }: TaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [goalSummary, setGoalSummary] = useState('')
  const [assigneeEmployeeIds, setAssigneeEmployeeIds] = useState<string[]>([])
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createTask({
          taskGroupId,
          title,
          assigneeEmployeeIds,
          goalSummary: goalSummary || undefined,
          priority,
        })
        setTitle('')
        setGoalSummary('')
        setAssigneeEmployeeIds([])
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        タスク名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        目標（達成基準）
        <input
          value={goalSummary}
          onChange={e => setGoalSummary(e.target.value)}
          maxLength={200}
          placeholder="例: 改善案の3案を立案"
          className="mt-1 block w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        担当者
        <div className="mt-1 w-56">
          <MultiEmployeePicker
            employees={assignableEmployees}
            value={assigneeEmployeeIds}
            onChange={setAssigneeEmployeeIds}
          />
        </div>
      </label>
      <label className="text-xs font-medium text-slate-700">
        優先度
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as TaskPriority)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        >
          {TASK_PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        タスクを追加
      </button>
    </form>
  )
}
