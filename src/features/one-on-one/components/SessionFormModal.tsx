'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordOneOnOneSession, updateOneOnOneSession } from '../actions'
import { TemplateSelector } from './TemplateSelector'
import type { ThemeTemplate, SessionRow } from '../types'

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
  /** 指定時は編集モード（未指定または null は新規記録） */
  editingSession?: SessionRow | null
}

/** ISO日時を datetime-local 入力用（ローカルタイム）に整形する */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function SessionFormModal({ open, onClose, employees, templates, editingSession }: Props) {
  const router = useRouter()
  const isEdit = Boolean(editingSession)
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [conductedAt, setConductedAt] = useState(new Date().toISOString().slice(0, 16))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 編集対象が変わったらフォームへ反映（新規時は初期化）
  useEffect(() => {
    if (!open) return
    if (editingSession) {
      setEmployeeId(editingSession.employee_id)
      setTheme(editingSession.theme)
      setNotes(editingSession.notes ?? '')
      setNextDate(editingSession.next_date ?? '')
      setConductedAt(toDatetimeLocal(editingSession.conducted_at))
    } else {
      setEmployeeId('')
      setTheme('')
      setNotes('')
      setNextDate('')
      setConductedAt(new Date().toISOString().slice(0, 16))
    }
    setError(null)
  }, [open, editingSession])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !theme) {
      setError('部下とテーマは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const payload = {
      employeeId,
      theme,
      notes: notes || undefined,
      nextDate: nextDate || undefined,
      conductedAt: new Date(conductedAt).toISOString(),
    }

    const result = editingSession
      ? await updateOneOnOneSession({ id: editingSession.id, ...payload })
      : await recordOneOnOneSession(payload)

    setLoading(false)
    if (result.success) {
      setEmployeeId('')
      setTheme('')
      setNotes('')
      setNextDate('')
      // サーバーデータを再取得して一覧・実施率を即時反映する
      router.refresh()
      onClose()
    } else {
      setError(result.error ?? (isEdit ? '更新に失敗しました' : '記録に失敗しました'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? '1on1 セッション編集' : '1on1 セッション記録'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部下 <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
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

          <TemplateSelector templates={templates} value={theme} onChange={setTheme} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">実施日時</label>
            <input
              type="datetime-local"
              value={conductedAt}
              onChange={e => setConductedAt(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">記録内容（任意）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="話した内容・気づき・アクションアイテムなど"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
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
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
              className="flex-1 rounded-lg bg-[#FD7601] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FD7601] disabled:opacity-50 transition-colors"
            >
              {loading ? (isEdit ? '更新中...' : '記録中...') : isEdit ? '更新する' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
