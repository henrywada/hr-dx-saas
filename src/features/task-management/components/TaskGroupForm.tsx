'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTaskGroup } from '../actions'

interface TaskGroupFormProps {
  milestoneId: string
}

export function TaskGroupForm({ milestoneId }: TaskGroupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [goalSummary, setGoalSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createTaskGroup({ milestoneId, name, goalSummary: goalSummary || undefined })
        setName('')
        setGoalSummary('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクグループの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 mt-2">
      <label className="text-xs font-medium text-slate-700">
        タスクグループ名
        <input
          value={name}
          onChange={e => setName(e.target.value)}
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
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        追加
      </button>
    </form>
  )
}
