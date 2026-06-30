'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleCareerAppointment } from '../actions'
import { ThemeSelector } from './ThemeSelector'
import type {
  CareerDiscussionEmployeeOption,
  CareerDiscussionThemeTemplate,
} from '../types'

interface Props {
  open: boolean
  onClose: () => void
  employees: CareerDiscussionEmployeeOption[]
  templates: CareerDiscussionThemeTemplate[]
}

export function CareerAppointmentFormModal({ open, onClose, employees, templates }: Props) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function resetForm() {
    setEmployeeId('')
    setTheme('')
    setScheduledAt('')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !scheduledAt) {
      setError('対象者と日時は必須です')
      return
    }

    setLoading(true)
    setError(null)

    const result = await scheduleCareerAppointment({
      employeeId,
      theme: theme || undefined,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes || undefined,
    })

    setLoading(false)
    if (result.success) {
      resetForm()
      router.refresh()
      onClose()
    } else {
      setError(result.error ?? '予約に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">キャリア面談を予約</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">対象者 *</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
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

          <ThemeSelector templates={templates} value={theme} onChange={setTheme} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">面談日時 *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">メモ（任意）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
              閉じる
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs text-white disabled:opacity-50">
              {loading ? '予約中...' : '予約する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
