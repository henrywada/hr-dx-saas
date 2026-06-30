'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUpcomingOneOnOne } from '../actions'
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

export function UpcomingScheduleModal({ open, onClose, employees, templates }: Props) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [agenda, setAgenda] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !theme || !scheduledAt) {
      setError('部下・テーマ・日時は必須です')
      return
    }
    setLoading(true)
    setError(null)

    const iso = new Date(scheduledAt).toISOString()
    const result = await createUpcomingOneOnOne({
      employeeId,
      theme,
      agenda: agenda || undefined,
      scheduledAt: iso,
    })

    setLoading(false)
    if (!result.success) {
      setError(result.error ?? '登録に失敗しました')
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">1on1 予定を登録（アジェンダ共有）</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">部下</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            >
              <option value="">選択してください</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.department_name ? `（${emp.department_name}）` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">テーマ</label>
            <input
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
              placeholder="例: 目標進捗確認"
            />
            <TemplateSelector templates={templates} value={theme} onChange={setTheme} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">予定日時</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">アジェンダ（事前共有）</label>
            <textarea
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
              placeholder="話し合うトピックを事前に共有できます"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border rounded-lg">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white disabled:opacity-50"
            >
              {loading ? '登録中…' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
