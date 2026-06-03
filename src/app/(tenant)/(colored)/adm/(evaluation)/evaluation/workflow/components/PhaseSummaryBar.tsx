'use client'

import type { PhaseCount } from '@/features/evaluation/workflow-types'

interface Props {
  phaseCounts: PhaseCount[]
  totalCount: number
}

export function PhaseSummaryBar({ phaseCounts, totalCount }: Props) {
  if (totalCount === 0) {
    return <p className="text-sm text-gray-500">この期間の評価シートがありません</p>
  }

  const confirmedCount = phaseCounts.find(p => p.status === 'confirmed')?.count ?? 0
  const confirmedPct = Math.round((confirmedCount / totalCount) * 100)

  return (
    <div className="space-y-4">
      {/* 積み上げプログレスバー */}
      <div className="overflow-hidden rounded-full bg-gray-100" style={{ height: '14px' }}>
        <div className="flex h-full">
          {phaseCounts.map(phase => (
            <div
              key={phase.status}
              title={`${phase.label}: ${phase.count}名`}
              style={{
                width: `${(phase.count / totalCount) * 100}%`,
                backgroundColor: phase.color,
              }}
            />
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {phaseCounts.map(phase => (
          <div key={phase.status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: phase.color }}
            />
            <span className="text-xs text-gray-600">
              {phase.label}
              <span className="ml-1 font-semibold text-gray-800">{phase.count}名</span>
              <span className="ml-0.5 text-gray-400">
                ({Math.round((phase.count / totalCount) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* 確定率サマリー */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">確定率:</span>
        <span
          className={`font-semibold ${
            confirmedPct === 100
              ? 'text-green-600'
              : confirmedPct >= 80
                ? 'text-yellow-600'
                : 'text-red-600'
          }`}
        >
          {confirmedPct}%
        </span>
        <span className="text-gray-400">
          （{confirmedCount} / {totalCount} 名）
        </span>
      </div>
    </div>
  )
}
