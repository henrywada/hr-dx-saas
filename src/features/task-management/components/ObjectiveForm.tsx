'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createObjective } from '../actions'
import { APP_ROUTES } from '@/config/routes'

export function ObjectiveForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createObjective({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        router.push(APP_ROUTES.tasks.objectiveDetail(id))
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xl">
      <label className="text-xs font-medium text-slate-700">
        目標名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        説明
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        期限
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        目標を作成
      </button>
    </form>
  )
}
