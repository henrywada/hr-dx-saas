'use client'

import { useState } from 'react'
import { createQuestionnairePeriod } from '@/features/questionnaire/actions'
import type { PeriodType, CreatePeriodInput } from '@/features/questionnaire/types'

interface Props {
  questionnaireId: string
  onSuccess: () => void
  onClose: () => void
}

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  weekly:     '週1回',
  monthly:    '月1回',
  date_range: '日付指定',
  none:       '指定なし',
}

export default function PeriodFormModal({ questionnaireId, onSuccess, onClose }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [label, setLabel]           = useState('')
  const [startDate, setStartDate]   = useState('')
  const [endDate, setEndDate]       = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      setError('期間名を入力してください。')
      return
    }

    const input: CreatePeriodInput = {
      questionnaire_id: questionnaireId,
      period_type: periodType,
      label: label.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
    }

    setIsSubmitting(true)
    setError(null)
    const result = await createQuestionnairePeriod(input)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error ?? '作成に失敗しました。')
      return
    }
    onSuccess()
  }

  const needsDates = periodType !== 'none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">実施期間を作成</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">実施タイプ</label>
            <select
              value={periodType}
              onChange={e => setPeriodType(e.target.value as PeriodType)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {(Object.keys(PERIOD_TYPE_LABELS) as PeriodType[]).map(type => (
                <option key={type} value={type}>{PERIOD_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              期間名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例: 2024年4月、2024年第1週"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {needsDates && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
