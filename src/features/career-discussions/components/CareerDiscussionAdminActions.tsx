'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCareerDiscussion, deleteCareerDiscussion } from '../actions'
import type { CareerDiscussionRow } from '../types'

interface Props {
  row: CareerDiscussionRow
}

export function CareerDiscussionAdminActions({ row }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [theme, setTheme] = useState(row.theme)
  const [careerAspiration, setCareerAspiration] = useState(row.career_aspiration ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [nextDate, setNextDate] = useState(row.next_date ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await updateCareerDiscussion({
      id: row.id,
      theme,
      careerAspiration: careerAspiration || undefined,
      notes: notes || undefined,
      nextDate: nextDate || null,
    })
    setLoading(false)
    if (result.success) {
      setIsEditing(false)
      router.refresh()
    } else {
      setError(result.error ?? '更新に失敗しました')
    }
  }

  async function handleDelete() {
    if (!window.confirm('この面談記録を削除しますか？')) return
    setLoading(true)
    const result = await deleteCareerDiscussion(row.id)
    setLoading(false)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? '削除に失敗しました')
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleUpdate} className="mt-3 space-y-2 border-t border-slate-100 pt-3 w-full">
        <input
          value={theme}
          onChange={e => setTheme(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          placeholder="テーマ"
        />
        <textarea
          value={careerAspiration}
          onChange={e => setCareerAspiration(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          placeholder="本人のキャリア志向"
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          placeholder="記録内容"
        />
        <input
          type="date"
          value={nextDate}
          onChange={e => setNextDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#FD7601] text-white disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          削除
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
