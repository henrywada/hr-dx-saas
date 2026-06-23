'use client'

import { useState, useTransition } from 'react'
import { createEvaluationPeriod, updateEvaluationPeriodStatus } from '@/features/evaluation/actions'
import {
  PERIOD_TYPE_LABELS,
  PERIOD_STATUS_LABELS,
  type EvaluationPeriod,
  type PeriodType,
  type PeriodStatus,
} from '@/features/evaluation/types'

interface Props {
  periods: EvaluationPeriod[]
}

const PERIOD_TYPES: PeriodType[] = ['first_half', 'second_half', 'full_year', 'quarterly']

const STATUS_FLOW: PeriodStatus[] = [
  'preparation',
  'goal_setting',
  'in_progress',
  'self_eval',
  'primary_eval',
  'secondary_eval',
  'confirmed',
  'closed',
]

const STATUS_COLORS: Record<PeriodStatus, string> = {
  preparation: 'bg-gray-100 text-gray-600',
  goal_setting: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  self_eval: 'bg-purple-50 text-purple-700',
  primary_eval: 'bg-yellow-50 text-yellow-700',
  secondary_eval: 'bg-orange-50 text-orange-700',
  confirmed: 'bg-green-50 text-green-700',
  closed: 'bg-gray-50 text-gray-400',
}

const currentYear = new Date().getFullYear()

export function EvalPeriodsClient({ periods }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [name, setName] = useState('')
  const [fiscalYear, setFiscalYear] = useState(currentYear)
  const [periodType, setPeriodType] = useState<PeriodType>('first_half')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return
    setError(null)
    startTransition(async () => {
      const result = await createEvaluationPeriod({
        name: name.trim(),
        fiscal_year: fiscalYear,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setShowCreateForm(false)
      setName('')
      setStartDate('')
      setEndDate('')
    })
  }

  function handleAdvanceStatus(period: EvaluationPeriod) {
    const currentIdx = STATUS_FLOW.indexOf(period.status)
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[currentIdx + 1]
    if (!confirm(`ステータスを「${PERIOD_STATUS_LABELS[nextStatus]}」に進めますか？`)) return
    setError(null)
    startTransition(async () => {
      const result = await updateEvaluationPeriodStatus({ id: period.id, status: nextStatus })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            disabled={isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            評価期間を作成
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">評価期間を作成</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">期間名 *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：2026年度 上半期評価"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">年度 *</label>
              <input
                type="number"
                value={fiscalYear}
                onChange={e => setFiscalYear(Number(e.target.value))}
                min={2020}
                max={2040}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">種別 *</label>
              <select
                value={periodType}
                onChange={e => setPeriodType(e.target.value as PeriodType)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                {PERIOD_TYPES.map(t => (
                  <option key={t} value={t}>
                    {PERIOD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">開始日 *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">終了日 *</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreateForm(false)
                setName('')
                setStartDate('')
                setEndDate('')
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !name.trim() || !startDate || !endDate}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {periods.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">評価期間がありません</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  期間名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  年度 / 種別
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  期間
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {periods.map(p => {
                const currentIdx = STATUS_FLOW.indexOf(p.status)
                const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{p.fiscal_year}年度</span>
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {PERIOD_TYPE_LABELS[p.period_type]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-xs text-gray-500">
                        {p.start_date} 〜 {p.end_date}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                      >
                        {PERIOD_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canAdvance && (
                        <button
                          onClick={() => handleAdvanceStatus(p)}
                          disabled={isPending}
                          className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                        >
                          次のステータスへ
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
