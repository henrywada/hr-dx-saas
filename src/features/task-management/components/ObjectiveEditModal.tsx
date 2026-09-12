'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateObjective } from '../actions'
import type { TaskObjective } from '../types'

interface ObjectiveEditModalProps {
  objective: TaskObjective
  onClose: () => void
}

/**
 * 目標名・説明・期限を編集するモーダル。
 * 呼び出し元: ObjectiveCard の「目標編集」ボタン。
 */
export function ObjectiveEditModal({ objective, onClose }: ObjectiveEditModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState(objective.title)
  const [description, setDescription] = useState(objective.description ?? '')
  const [dueDate, setDueDate] = useState(objective.dueDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateObjective({
          objectiveId: objective.id,
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        onClose()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の更新に失敗しました')
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
        <h2 className="text-sm font-semibold text-slate-900">目標編集</h2>
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
            rows={4}
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
            disabled={isPending || !title.trim()}
            className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            保存する
          </button>
        </div>
      </form>
    </div>
  )
}
