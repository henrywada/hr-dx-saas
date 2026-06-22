'use client'

import { useState, useTransition } from 'react'
import { createPosition, updatePosition } from '../actions'
import type {
  PositionWithCandidates,
  PositionFormInput,
  PositionRiskLevel,
  EmployeeOption,
  DivisionOption,
} from '../types'
import { RISK_LEVEL_LABELS } from '../types'

interface Props {
  position?: PositionWithCandidates | null
  employees: EmployeeOption[]
  divisions: DivisionOption[]
  onClose: () => void
}

const RISK_LEVELS: PositionRiskLevel[] = ['high', 'medium', 'low']

export function PositionFormModal({ position, employees, divisions, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<PositionFormInput>({
    title: position?.title ?? '',
    division_id: position?.division_id ?? null,
    current_holder_id: position?.current_holder_id ?? null,
    risk_level: position?.risk_level ?? 'medium',
    notes: position?.notes ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('ポジション名を入力してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = position ? await updatePosition(position.id, form) : await createPosition(form)

      if (result.success === false) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {position ? 'ポジション編集' : 'ポジション追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ポジション名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例: 営業部長、技術マネージャー"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">担当部署</label>
            <select
              value={form.division_id ?? ''}
              onChange={e => setForm(f => ({ ...f, division_id: e.target.value || null }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]"
            >
              <option value="">（指定なし）</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">現任者</label>
            <select
              value={form.current_holder_id ?? ''}
              onChange={e => setForm(f => ({ ...f, current_holder_id: e.target.value || null }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]"
            >
              <option value="">（指定なし）</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department_name ? ` (${e.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">リスクレベル</label>
            <div className="flex gap-2">
              {RISK_LEVELS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, risk_level: r }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.risk_level === r
                      ? 'border-[#FD7601] bg-[#f6f8fa] text-[#FD7601]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {RISK_LEVEL_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="ポジションの説明や特記事項"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#FD7601] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#FD7601] disabled:opacity-50"
            >
              {isPending ? '保存中…' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
