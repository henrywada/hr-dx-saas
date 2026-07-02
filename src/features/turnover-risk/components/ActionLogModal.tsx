'use client'

import { useEffect, useState } from 'react'
import { logTurnoverRiskAction, fetchTurnoverRiskActionLogs } from '../actions'
import { ACTION_TYPE_LABELS } from '../types'
import type { ActionLog, ActionType } from '../types'

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

function formatActionDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActionLogModal({ employeeId, employeeName, isOpen, onClose }: Props) {
  const [actionType, setActionType] = useState<ActionType>('one_on_one')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null = 未読み込み（読み込み中表示）、配列 = 読み込み済み
  const [logs, setLogs] = useState<ActionLog[] | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetchTurnoverRiskActionLogs(employeeId).then(result => {
      if (!cancelled) setLogs(result)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, employeeId])

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
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 bg-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">アクションを記録する</h2>
          <p className="mt-0.5 text-sm text-gray-600">{employeeName}</p>
        </div>

        <div className="overflow-y-auto border-b border-gray-200 px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            記録履歴
          </p>
          {logs === null ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">記録はまだありません</p>
          ) : (
            <ul className="space-y-2">
              {logs.map(log => (
                <li key={log.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {ACTION_TYPE_LABELS[log.action_type]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatActionDate(log.actioned_at)}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-gray-600">{log.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">アクション種別</label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value as ActionType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_TYPES.map(t => (
                <option key={t} value={t}>
                  {ACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">メモ（任意）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="面談内容や次のアクションを記録してください"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{notes.length}/1000</p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

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
