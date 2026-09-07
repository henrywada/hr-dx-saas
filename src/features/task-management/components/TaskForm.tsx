'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '../actions'
import { TASK_PRIORITIES, type TaskPriority } from '../types'

interface TaskFormProps {
  taskGroupId: string
}

export function TaskForm({ taskGroupId }: TaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState('')
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
          assigneeEmployeeId: assigneeEmployeeId || undefined,
          priority,
        })
        setTitle('')
        setAssigneeEmployeeId('')
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
        担当者の従業員ID
        <input
          value={assigneeEmployeeId}
          onChange={e => setAssigneeEmployeeId(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
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
