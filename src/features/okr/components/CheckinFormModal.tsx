'use client'

import { useState } from 'react'
import { submitCheckin } from '../actions'
import { CONFIDENCE_LABELS } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  keyResultId: string
  keyResultTitle: string
  krType: string
  targetValue: number | null
  unit: string | null
}

export function CheckinFormModal({
  open,
  onClose,
  keyResultId,
  keyResultTitle,
  krType,
  targetValue,
  unit,
}: Props) {
  const [confidence, setConfidence] = useState(3)
  const [currentValue, setCurrentValue] = useState('')
  const [comment, setComment] = useState('')
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await submitCheckin({
      key_result_id: keyResultId,
      confidence,
      current_value: krType === 'quantitative' && currentValue !== '' ? Number(currentValue) : null,
      comment: comment.trim() || null,
      checkin_date: checkinDate,
    })

    setLoading(false)
    if (result.success === false) {
      setError(result.error ?? 'チェックインに失敗しました')
      return
    }

    setConfidence(3)
    setCurrentValue('')
    setComment('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-500 mb-0.5">チェックイン</p>
          <h2 className="text-base font-semibold text-gray-900 leading-snug">{keyResultTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* 信頼度スライダー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              達成見込み（信頼度）
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={confidence}
              onChange={e => setConfidence(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  className={`text-xs ${confidence === n ? 'font-bold text-primary' : 'text-gray-400'}`}
                >
                  {n}
                </span>
              ))}
            </div>
            <p className="mt-1 text-center text-sm font-medium text-gray-700">
              {confidence} — {CONFIDENCE_LABELS[confidence]}
            </p>
          </div>

          {/* 現在値（定量KRの場合のみ表示）*/}
          {krType === 'quantitative' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在値
                {targetValue != null && (
                  <span className="ml-1 font-normal text-gray-500">
                    （目標: {targetValue}
                    {unit ?? ''}）
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  placeholder="0"
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {unit && <span className="text-sm text-gray-500 flex-shrink-0">{unit}</span>}
              </div>
            </div>
          )}

          {/* コメント */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              コメント（今週の状況・障壁・ネクストアクション）
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="進捗状況・課題・次のアクションを記入"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* チェックイン日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">チェックイン日</label>
            <input
              type="date"
              value={checkinDate}
              onChange={e => setCheckinDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '記録中...' : 'チェックインを記録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
