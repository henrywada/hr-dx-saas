'use client'

import { useState } from 'react'
import { logTurnoverRiskAction } from '../actions'
import { ACTION_TYPE_LABELS } from '../types'
import type { ActionType } from '../types'

interface Props {
  employeeId: string
  employeeName: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_TYPES: ActionType[] = [
  'one_on_one',
  'counseling',
  'manager_talk',
  'hr_interview',
  'other',
]

export function ActionLogModal({
  employeeId,
  employeeName,
  isOpen,
  onClose,
}: Props) {
  const [actionType, setActionType] = useState<ActionType>('one_on_one')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await logTurnoverRiskAction({ employeeId, actionType, notes })
    setIsSubmitting(false)

    if (result.success) {
      setNotes('')
      onClose()
    } else {
      setError(result.error ?? 'エラーが発生しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 bg-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">アクションを記録する</h2>
          <p className="mt-0.5 text-sm text-gray-600">{employeeName}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              アクション種別
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              メモ（任意）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="面談内容や次のアクションを記録してください"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {notes.length}/1000
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
