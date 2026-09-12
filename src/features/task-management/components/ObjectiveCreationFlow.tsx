'use client'

import { useState, useTransition } from 'react'
import { createObjective } from '../actions'
import { ObjectiveWorkspace } from './ObjectiveWorkspace'
import type { EmployeeOption } from '../employee-filter'

interface ObjectiveCreationFlowProps {
  managers: EmployeeOption[]
}

/**
 * 目標作成 → タスク作成（複数回）を1画面で行うフロー。
 * 目標作成前は Step1（インラインフォーム）、
 * 作成後は Step2（ObjectiveWorkspace）を表示する。
 */
export function ObjectiveCreationFlow({ managers }: ObjectiveCreationFlowProps) {
  const [objective, setObjective] = useState<{
    id: string
    taskGroupId: string
    title: string
    description: string
    dueDate: string
  } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCreateObjective(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id, defaultTaskGroupId } = await createObjective({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        setObjective({
          id,
          taskGroupId: defaultTaskGroupId,
          title,
          description,
          dueDate,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      }
    })
  }

  if (!objective) {
    return (
      <form onSubmit={handleCreateObjective} className="space-y-3">
        <h1 className="text-lg font-semibold text-slate-900">新しい目標を作成</h1>
        <label className="block text-xs font-medium text-slate-700">
          目標名
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          説明
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
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
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          目標を作成
        </button>
      </form>
    )
  }

  return (
    <ObjectiveWorkspace
      heading="目標を作成しました"
      objective={objective}
      managers={managers}
      initialTasks={[]}
    />
  )
}
