'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMilestone } from '../actions'

interface MilestoneFormProps {
  objectiveId: string
}

export function MilestoneForm({ objectiveId }: MilestoneFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createMilestone({ objectiveId, title, dueDate: dueDate || undefined })
        setTitle('')
        setDueDate('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'マイルストーンの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        マイルストーン名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        期限
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
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
