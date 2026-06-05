'use client'

// TrainingPlanList から import される

import { useState, useTransition } from 'react'
import { createEmployeeTrainingPlan } from '../training-plan-actions'
import type { TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  templates: TrainingPlanTemplateRow[]
  employees: { id: string; name: string; department_name: string | null }[]
  onClose: () => void
}

export function TrainingCreatePlanModal({ templates, employees, onClose }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTemplate = templates.find(t => t.id === templateId) ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) { setError('従業員を選択してください'); return }
    if (!templateId) { setError('テンプレートを選択してください'); return }
    setError(null)

    startTransition(async () => {
      const result = await createEmployeeTrainingPlan({
        employeeId,
        templateId,
        dueDate: dueDate || undefined,
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
          <h2 className="text-lg font-semibold text-gray-900">育成計画を作成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              テンプレート <span className="text-red-500">*</span>
            </label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">選択してください</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.courses.length} コース）
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && selectedTemplate.courses.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                以下の {selectedTemplate.courses.length} 件のコースがアサインされます
              </p>
              <ul className="space-y-1">
                {selectedTemplate.courses.slice(0, 5).map(c => (
                  <li key={c.id} className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">✓</span>
                    {c.title}
                  </li>
                ))}
                {selectedTemplate.courses.length > 5 && (
                  <li className="text-xs text-gray-400">
                    他 {selectedTemplate.courses.length - 5} 件...
                  </li>
                )}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期限（任意）</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? '処理中...' : '計画を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
