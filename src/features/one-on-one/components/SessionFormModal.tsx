'use client'

import { useState } from 'react'
import { recordOneOnOneSession } from '../actions'
import { TemplateSelector } from './TemplateSelector'
import type { ThemeTemplate } from '../types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  employees: Employee[]
  templates: ThemeTemplate[]
}

export function SessionFormModal({ open, onClose, employees, templates }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [conductedAt, setConductedAt] = useState(
    new Date().toISOString().slice(0, 16)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !theme) {
      setError('部下とテーマは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const result = await recordOneOnOneSession({
      employeeId,
      theme,
      notes: notes || undefined,
      nextDate: nextDate || undefined,
      conductedAt: new Date(conductedAt).toISOString(),
    })

    setLoading(false)
    if (result.success) {
      setEmployeeId('')
      setTheme('')
      setNotes('')
      setNextDate('')
      onClose()
    } else {
      setError(result.error ?? '記録に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">1on1 セッション記録</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部下 <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            >
              <option value="">選択してください</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.department_name ? ` (${emp.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <TemplateSelector
            templates={templates}
            value={theme}
            onChange={setTheme}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              実施日時
            </label>
            <input
              type="datetime-local"
              value={conductedAt}
              onChange={e => setConductedAt(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              記録内容（任意）
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="話した内容・気づき・アクションアイテムなど"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              次回予定日（任意）
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
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
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
