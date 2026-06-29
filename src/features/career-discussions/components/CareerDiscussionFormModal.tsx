'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCareerDiscussion } from '../actions'
import { ThemeSelector } from './ThemeSelector'
import type {
  CareerDiscussionThemeTemplate,
  CareerDiscussionEmployeeOption,
  EvaluationPeriodOption,
} from '../types'

interface Props {
  open: boolean
  onClose: () => void
  employees: CareerDiscussionEmployeeOption[]
  templates: CareerDiscussionThemeTemplate[]
  evaluationPeriods: EvaluationPeriodOption[]
}

export function CareerDiscussionFormModal({
  open,
  onClose,
  employees,
  templates,
  evaluationPeriods,
}: Props) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [theme, setTheme] = useState('')
  const [careerAspiration, setCareerAspiration] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [evaluationPeriodId, setEvaluationPeriodId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function resetForm() {
    setEmployeeId('')
    setTheme('')
    setCareerAspiration('')
    setNotes('')
    setNextDate('')
    setEvaluationPeriodId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !theme) {
      setError('対象者とテーマは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const result = await createCareerDiscussion({
      employeeId,
      theme,
      careerAspiration: careerAspiration || undefined,
      notes: notes || undefined,
      nextDate: nextDate || undefined,
      evaluationPeriodId: evaluationPeriodId || undefined,
    })

    setLoading(false)
    if (result.success) {
      resetForm()
      router.refresh()
      onClose()
    } else {
      setError(result.error ?? '記録に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">キャリア面談の記録</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              対象者 <span className="text-red-500">*</span>
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

          <ThemeSelector templates={templates} value={theme} onChange={setTheme} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              本人のキャリア志向・希望（任意）
            </label>
            <textarea
              value={careerAspiration}
              onChange={e => setCareerAspiration(e.target.value)}
              rows={2}
              placeholder="将来やりたいこと・異動希望など"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
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

          {evaluationPeriods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                関連する評価期間（任意）
              </label>
              <select
                value={evaluationPeriodId}
                onChange={e => setEvaluationPeriodId(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">紐付けない</option>
                {evaluationPeriods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fiscal_year}年度 {p.period_type}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
