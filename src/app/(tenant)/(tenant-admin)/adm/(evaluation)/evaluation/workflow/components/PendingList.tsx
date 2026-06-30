'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { PendingEmployee } from '@/features/evaluation/workflow-types'
import { FLOW_STATUS_LABELS } from '@/features/evaluation/types'
import {
  sendReminder,
  sendBulkReminder,
  rollbackEvaluationFlow,
} from '@/features/evaluation/workflow-actions'

interface Props {
  periodId: string
  pendingEmployees: PendingEmployee[]
}

const ROLLBACK_OPTIONS: { label: string; to_status: string }[] = [
  { label: '目標設定へ戻す', to_status: 'goal_set' },
  { label: '自己評価へ戻す', to_status: 'self_eval' },
  { label: '一次評価へ戻す', to_status: 'primary_eval' },
  { label: '二次評価へ戻す', to_status: 'secondary_eval' },
]

export function PendingList({ periodId, pendingEmployees }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMessage, setBulkMessage] = useState('')
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<PendingEmployee | null>(null)
  const [rollbackComment, setRollbackComment] = useState('')
  const [rollbackStatus, setRollbackStatus] = useState('')

  function toggleSelect(sheetId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(sheetId)) next.delete(sheetId)
      else next.add(sheetId)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === pendingEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingEmployees.map(e => e.sheet_id)))
    }
  }

  function handleSingleReminder(emp: PendingEmployee) {
    setMessage(null)
    startTransition(async () => {
      const result = await sendReminder({
        period_id: periodId,
        sheet_id: emp.sheet_id,
        reminder_type:
          emp.days_remaining !== null && emp.days_remaining < 0
            ? 'overdue'
            : 'deadline_approaching',
        target_status: emp.flow_status,
      })
      setMessage(
        result.success
          ? { type: 'success', text: `${emp.employee_name} へ催促を送信しました` }
          : { type: 'error', text: 'error' in result ? result.error : '送信失敗' }
      )
    })
  }

  function handleBulkReminder() {
    if (selectedIds.size === 0) return
    setMessage(null)
    startTransition(async () => {
      const result = await sendBulkReminder({
        period_id: periodId,
        sheet_ids: Array.from(selectedIds),
        message: bulkMessage.trim() || undefined,
      })
      if (result.success) {
        setMessage({
          type: 'success',
          text: `${result.sent_count}名へ一括催促を送信しました（メール ${result.email_sent_count ?? 0}件）`,
        })
        setSelectedIds(new Set())
        setShowBulkForm(false)
        setBulkMessage('')
      } else {
        setMessage({ type: 'error', text: result.error ?? '送信失敗' })
      }
    })
  }

  function handleRollback() {
    if (!rollbackTarget || !rollbackStatus) return
    setMessage(null)
    startTransition(async () => {
      const result = await rollbackEvaluationFlow({
        sheet_id: rollbackTarget.sheet_id,
        period_id: periodId,
        to_status: rollbackStatus,
        comment: rollbackComment.trim() || undefined,
      })
      if (result.success) {
        setMessage({
          type: 'success',
          text: `${rollbackTarget.employee_name} のフローを差し戻しました`,
        })
        setRollbackTarget(null)
        setRollbackComment('')
        setRollbackStatus('')
      } else {
        setMessage({ type: 'error', text: 'error' in result ? result.error : '差し戻し失敗' })
      }
    })
  }

  if (pendingEmployees.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-green-700">全員の評価が確定しています！</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 一括操作バー */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleAll} className="text-xs text-primary hover:underline">
          {selectedIds.size === pendingEmployees.length ? '全解除' : '全選択'}
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkForm(v => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-100"
          >
            {selectedIds.size}名を一括催促
          </button>
        )}
      </div>

      {/* 一括催促フォーム */}
      {showBulkForm && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 text-sm font-medium text-yellow-800">
            選択した {selectedIds.size} 名に催促メッセージを送ります
          </p>
          <textarea
            value={bulkMessage}
            onChange={e => setBulkMessage(e.target.value)}
            placeholder="メッセージを入力（省略可）"
            rows={2}
            className="w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowBulkForm(false)
                setBulkMessage('')
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleBulkReminder}
              disabled={isPending}
              className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {isPending ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      )}

      {/* 差し戻しモーダル */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-800">フローを差し戻す</h3>
            <p className="mb-4 text-sm text-gray-500">
              対象:{' '}
              <span className="font-medium text-gray-700">{rollbackTarget.employee_name}</span>
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">差し戻し先</label>
              <select
                value={rollbackStatus}
                onChange={e => setRollbackStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">— 選択 —</option>
                {ROLLBACK_OPTIONS.map(o => (
                  <option key={o.to_status} value={o.to_status}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                コメント（任意）
              </label>
              <textarea
                value={rollbackComment}
                onChange={e => setRollbackComment(e.target.value)}
                placeholder="差し戻しの理由を入力"
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRollbackTarget(null)
                  setRollbackComment('')
                  setRollbackStatus('')
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                キャンセル
              </button>
              <button
                onClick={handleRollback}
                disabled={isPending || !rollbackStatus}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? '処理中...' : '差し戻す'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未提出者テーブル */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === pendingEmployees.length && pendingEmployees.length > 0
                  }
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                従業員
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                フロー状態
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                期限
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pendingEmployees.map(emp => {
              const isOverdue = emp.days_remaining !== null && emp.days_remaining < 0
              const isUrgent =
                emp.days_remaining !== null && emp.days_remaining >= 0 && emp.days_remaining <= 3
              return (
                <tr key={emp.sheet_id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.sheet_id)}
                      onChange={() => toggleSelect(emp.sheet_id)}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {emp.employee_name}
                      {emp.employee_code && (
                        <span className="ml-1 text-xs text-gray-400">({emp.employee_code})</span>
                      )}
                    </div>
                    {emp.division_path && (
                      <div className="text-xs text-gray-400">{emp.division_path}</div>
                    )}
                    {emp.last_reminder_at && (
                      <div className="text-xs text-blue-400">
                        最終催促:{' '}
                        {format(parseISO(emp.last_reminder_at), 'M/d HH:mm', { locale: ja })}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {FLOW_STATUS_LABELS[emp.flow_status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {emp.phase_deadline ? (
                      <span
                        className={`text-xs font-medium ${
                          isOverdue
                            ? 'text-red-600'
                            : isUrgent
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {emp.phase_deadline}
                        {emp.days_remaining !== null && (
                          <span className="ml-1">
                            {isOverdue
                              ? `(${Math.abs(emp.days_remaining)}日超過)`
                              : `(残${emp.days_remaining}日)`}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSingleReminder(emp)}
                        disabled={isPending}
                        className="rounded border border-yellow-300 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                      >
                        催促
                      </button>
                      <button
                        onClick={() => setRollbackTarget(emp)}
                        disabled={isPending}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        差し戻し
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
