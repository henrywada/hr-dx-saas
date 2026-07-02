'use client'

import { RiskLevelBadge } from './RiskLevelBadge'
import { RiskFactorBreakdown } from './RiskFactorBreakdown'
import type { TurnoverRiskRow } from '../types'

interface Props {
  row: TurnoverRiskRow
  onClose: () => void
}

export function RiskDetailModal({ row, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 bg-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{row.employee_name}</h2>
              <p className="mt-0.5 text-sm text-gray-600">{row.department_name ?? '—'}</p>
            </div>
            <RiskLevelBadge level={row.risk_level} />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{row.risk_score}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <RiskFactorBreakdown factors={row.score_factors} />
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
