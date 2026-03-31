/**
 * 残業申請一覧のフィルタ（月切替・ステータス複数）
 */
'use client'

import type { OvertimeApplicationStatus } from '../types'
import { shiftYearMonth } from '@/features/overtime/queries'

const STATUS_OPTIONS: OvertimeApplicationStatus[] = [
  '申請中',
  '承認済',
  '却下',
  '修正依頼',
]

export type FiltersState = {
  month: string
  statuses: OvertimeApplicationStatus[]
  /** 同一部署の全員を一覧に含める（該当申請がない人は「未申請」行） */
  showAllDivisionEmployees: boolean
}

type Props = {
  value: FiltersState
  onChange: (next: FiltersState) => void
  disabled?: boolean
  /** 上長かつ部署ありのときのみ表示 */
  showDivisionEmployeeOption?: boolean
}

export function Filters({ value, onChange, disabled, showDivisionEmployeeOption }: Props) {
  function toggleStatus(s: OvertimeApplicationStatus) {
    const set = new Set(value.statuses)
    if (set.has(s)) set.delete(s)
    else set.add(s)
    onChange({ ...value, statuses: [...set] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, month: shiftYearMonth(value.month, -1) })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          前月
        </button>
        <span className="min-w-22 text-center text-lg font-semibold tabular-nums text-slate-900">
          {value.month}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, month: shiftYearMonth(value.month, 1) })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          翌月
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const now = new Date()
            const y = now.getFullYear()
            const m = String(now.getMonth() + 1).padStart(2, '0')
            onChange({ ...value, month: `${y}-${m}` })
          }}
          className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100/80 disabled:opacity-50"
        >
          今月
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">ステータス（複数選択可）</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const on = value.statuses.includes(s)
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => toggleStatus(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {showDivisionEmployeeOption && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={value.showAllDivisionEmployees}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, showAllDivisionEmployees: e.target.checked })
            }
          />
          <span>
            <span className="font-medium text-slate-800">部署の全従業員を表示</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              当月・ステータス条件に該当する申請がないメンバーも1行表示します（未申請）
            </span>
          </span>
        </label>
      )}
    </div>
  )
}
