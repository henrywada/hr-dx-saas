// 呼び出し元: LifecycleDashboard.tsx — showNewModal が true の時にレンダリング
'use client'

import { useState, useTransition } from 'react'
import { createLifecycleInstance } from '../actions'
import type { LifecycleTaskTemplate } from '../types'

interface Props {
  lifecycleType: 'onboarding' | 'offboarding'
  employees: { id: string; name: string; department_name: string | null }[]
  templates: LifecycleTaskTemplate[]
  onClose: () => void
}

export function NewInstanceModal({ lifecycleType, employees, templates, onClose }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = lifecycleType === 'onboarding' ? '入社フロー開始' : '退社フロー開始'
  const dateLabel = lifecycleType === 'onboarding' ? '入社予定日' : '退社予定日'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) {
      setError('従業員を選択してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createLifecycleInstance({
        employeeId,
        lifecycleType,
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
      })

      if (!result.success) {
        setError(result.error ?? 'エラーが発生しました')
        return
      }

      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              従業員 <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">選択してください</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.department_name ? ` (${emp.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dateLabel}</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lifecycleType === 'offboarding' ? '引き継ぎメモ' : '備考'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={
                lifecycleType === 'offboarding'
                  ? '引き継ぎ内容・注意事項を記入...'
                  : '備考を入力...'
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {templates.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                以下の {templates.length} 件のタスクが自動生成されます
              </p>
              <ul className="space-y-1">
                {templates.slice(0, 5).map(t => (
                  <li key={t.id} className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">✓</span>
                    {t.title}
                  </li>
                ))}
                {templates.length > 5 && (
                  <li className="text-xs text-gray-400">他 {templates.length - 5} 件...</li>
                )}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? '処理中...' : 'フロー開始'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
