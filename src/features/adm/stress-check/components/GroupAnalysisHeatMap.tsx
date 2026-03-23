'use client'

import React from 'react'
import type { GroupData } from '../queries'

interface GroupAnalysisHeatMapProps {
  groups: GroupData[]
  onSelect: (group: GroupData) => void
  selectedDivisionId?: string | null
  highlightThreshold?: number
}

export default function GroupAnalysisHeatMap({
  groups,
  onSelect,
  selectedDivisionId,
  highlightThreshold = 120,
}: GroupAnalysisHeatMapProps) {
  const getColorClass = (risk: number) => {
    if (risk >= highlightThreshold) return 'bg-red-600 text-white border-red-700 hover:bg-red-700'
    if (risk >= 110) return 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
    return 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
  }

  const getRiskLabel = (risk: number) => {
    if (risk >= highlightThreshold) return '高リスク'
    if (risk >= 110) return '要注意'
    return '良好'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
      {groups.map(group => {
        const isSelected = group.division_id === selectedDivisionId
        return (
        <div
          key={group.division_id}
          onClick={() => onSelect(group)}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 ${getColorClass(group.health_risk)} ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold tracking-tight">{group.name}</div>
              <div className="text-xs opacity-75 mt-1">{group.member_count}名</div>
            </div>
            <div className={`px-3 py-1 text-xs font-medium rounded-full bg-white/20`}>
              {getRiskLabel(group.health_risk)}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-6xl font-bold tracking-tighter">{group.health_risk}</div>
            <div className="text-xs opacity-75 -mt-1">健康リスク</div>
          </div>

          <div className="mt-6 text-center text-xs opacity-75">
            高ストレス率 {group.high_stress_rate}%
          </div>
        </div>
        )
      })}
    </div>
  )
}
