'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitConsultation } from '../actions'
import { APP_ROUTES } from '@/config/routes'
import type { ConsultationCategory } from '../types'

const CATEGORY_OPTIONS: { value: ConsultationCategory; label: string }[] = [
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'mental_health', label: 'メンタルヘルス' },
  { value: 'workload', label: '業務量' },
  { value: 'interpersonal', label: '人間関係' },
  { value: 'other', label: 'その他' },
]

export function ConsultationForm() {
  const router = useRouter()
  const [category, setCategory] = useState<ConsultationCategory>('other')
  const [body, setBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await submitConsultation({ category, body, isAnonymous })
        router.push(APP_ROUTES.TENANT.CONSULTATION_DETAIL(result.id))
      } catch {
        setError('送信に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        カテゴリ
        <select
          value={category}
          onChange={e => setCategory(e.target.value as ConsultationCategory)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        相談内容
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={2000}
          rows={6}
          required
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={e => setIsAnonymous(e.target.checked)}
        />
        対応者には匿名で送信する
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || body.length === 0}
        className="rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        {isPending ? '送信中...' : '相談を送信'}
      </button>
    </form>
  )
}
