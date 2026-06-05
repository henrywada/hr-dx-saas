'use client'

import { useState, useTransition } from 'react'
import { upsertCandidate } from '../actions'
import type {
  CandidateRow,
  CandidateFormInput,
  ReadinessLevel,
  EmployeeOption,
  PositionWithCandidates,
} from '../types'
import { READINESS_LABELS } from '../types'

interface Props {
  position: PositionWithCandidates
  candidate?: CandidateRow | null
  employees: EmployeeOption[]
  onClose: () => void
}

const READINESS_OPTIONS: ReadinessLevel[] = [
  'ready_now',
  'one_to_two_years',
  'three_to_five_years',
]
const SCORE_OPTIONS = [1, 2, 3] as const
const SCORE_LABELS = ['低', '中', '高'] as const

export function CandidateFormModal({ position, candidate, employees, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CandidateFormInput>({
    position_id: position.id,
    employee_id: candidate?.employee_id ?? '',
    readiness: candidate?.readiness ?? 'three_to_five_years',
    performance_score: candidate?.performance_score ?? 2,
    potential_score: candidate?.potential_score ?? 2,
    development_actions: candidate?.development_actions ?? '',
    notes: candidate?.notes ?? '',
  })

  // 既登録済みの従業員を除外（編集中は自分自身を除外しない）
  const registeredIds = new Set(position.candidates.map(c => c.employee_id))
  if (candidate) registeredIds.delete(candidate.employee_id)
  const availableEmployees = employees.filter(e => !registeredIds.has(e.id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) {
      setError('候補者を選択してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await upsertCandidate(form)
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900">後継候補の登録</h2>
            <p className="text-sm text-gray-500">{position.title}</p>
          </div>
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
              候補者 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              disabled={!!candidate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">（選択してください）</option>
              {availableEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department_name ? ` (${e.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">準備度</label>
            <div className="flex gap-2">
              {READINESS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, readiness: r }))}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    form.readiness === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {READINESS_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                パフォーマンス
              </label>
              <div className="flex gap-1">
                {SCORE_OPTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, performance_score: s }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      form.performance_score === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SCORE_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ポテンシャル
              </label>
              <div className="flex gap-1">
                {SCORE_OPTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, potential_score: s }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      form.potential_score === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SCORE_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">育成アクション</label>
            <textarea
              value={form.development_actions}
              onChange={e => setForm(f => ({ ...f, development_actions: e.target.value }))}
              rows={2}
              placeholder="例: 月1回の1on1、部門横断プロジェクトへのアサイン"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="特記事項"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '保存中…' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
