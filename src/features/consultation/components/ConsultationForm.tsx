'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitConsultation } from '../actions'
import { APP_ROUTES } from '@/config/routes'
import type { ConsultationCategory, EligibleManager } from '../types'

const CATEGORY_OPTIONS: { value: ConsultationCategory; label: string }[] = [
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'mental_health', label: 'メンタルヘルス' },
  { value: 'workload', label: '業務量' },
  { value: 'interpersonal', label: '人間関係' },
  { value: 'other', label: 'その他' },
]

type BigCategory = 'medical_staff' | 'other'
type OtherTarget = 'hr' | 'hr_manager' | 'manager' | 'hsc' | 'other_any'

const OTHER_TARGET_OPTIONS: { value: OtherTarget; label: string }[] = [
  { value: 'hr', label: '人事' },
  { value: 'hr_manager', label: '人事責任者' },
  { value: 'manager', label: '上司' },
  { value: 'hsc', label: '安全衛生委員' },
  { value: 'other_any', label: '誰でもいい' },
]

interface ConsultationFormProps {
  eligibleManagers: EligibleManager[]
}

export function ConsultationForm({ eligibleManagers }: ConsultationFormProps) {
  const router = useRouter()
  const [category, setCategory] = useState<ConsultationCategory>('other')
  const [body, setBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [bigCategory, setBigCategory] = useState<BigCategory>('other')
  const [otherTarget, setOtherTarget] = useState<OtherTarget>('hr')
  const [managerId, setManagerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const targetType = bigCategory === 'medical_staff' ? 'medical_staff' : otherTarget

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (targetType === 'manager' && managerId === '') {
      setError('指名する上司を選択してください。')
      return
    }

    startTransition(async () => {
      try {
        const result = await submitConsultation({
          category,
          body,
          isAnonymous,
          targetType,
          targetEmployeeId: targetType === 'manager' ? managerId : undefined,
        })
        if (isAnonymous && result.anonymousToken) {
          const url = `${window.location.origin}${APP_ROUTES.PUBLIC.CONSULTATION_STATUS}?token=${result.anonymousToken}`
          setStatusUrl(url)
          return
        }
        router.push(APP_ROUTES.TENANT.CONSULTATION_DETAIL(result.id))
      } catch {
        setError('送信に失敗しました。もう一度お試しください。')
      }
    })
  }

  if (statusUrl) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
        <h2 className="text-sm font-bold text-slate-900">相談を受け付けました</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          匿名相談の進捗は、以下の URL からログインなしで確認できます。URL を控えてください。
        </p>
        <code className="block text-xs break-all rounded-lg bg-white border border-slate-200 p-3 text-slate-800">
          {statusUrl}
        </code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(statusUrl)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            URL をコピー
          </button>
          <button
            type="button"
            onClick={() => router.push(APP_ROUTES.TENANT.CONSULTATION)}
            className="rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white"
          >
            相談一覧へ
          </button>
        </div>
      </div>
    )
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

      <fieldset className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        <legend>相談先</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="bigCategory"
            checked={bigCategory === 'medical_staff'}
            onChange={() => setBigCategory('medical_staff')}
          />
          産業医・保健師
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="bigCategory"
            checked={bigCategory === 'other'}
            onChange={() => setBigCategory('other')}
          />
          その他
        </label>
      </fieldset>

      {bigCategory === 'other' && (
        <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
          相談先（詳細）
          <select
            value={otherTarget}
            onChange={e => setOtherTarget(e.target.value as OtherTarget)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            {OTHER_TARGET_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {bigCategory === 'other' && otherTarget === 'manager' && (
        <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
          指名する上司
          <select
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="">選択してください</option>
            {eligibleManagers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-1 text-xs text-(--text-secondary)">
        <legend>匿名性</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="isAnonymous"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(true)}
          />
          匿名を希望する
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="isAnonymous"
            checked={!isAnonymous}
            onChange={() => setIsAnonymous(false)}
          />
          匿名を希望しない
        </label>
      </fieldset>

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
