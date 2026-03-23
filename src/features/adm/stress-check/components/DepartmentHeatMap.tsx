'use client'

import React from 'react'
import type { GroupAnalysisDepartment } from '../types'

interface DepartmentHeatMapProps {
  departments: GroupAnalysisDepartment[]
}

export default function DepartmentHeatMap({ departments }: DepartmentHeatMapProps) {
  const getColorClass = (risk: number | null) => {
    if (risk == null) return 'bg-gray-300 text-gray-600 border-gray-400'
    if (risk >= 120) return 'bg-red-600 text-white border-red-700'
    if (risk >= 110) return 'bg-orange-500 text-white border-orange-600'
    return 'bg-emerald-500 text-white border-emerald-600'
  }

  const getRiskLabel = (risk: number | null) => {
    if (risk == null) return '非表示'
    if (risk >= 120) return '高リスク'
    if (risk >= 110) return '要注意'
    return '良好'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
      {departments.map((dept) => (
        <div
          key={dept.departmentName}
          className={`p-6 rounded-2xl border-2 transition-all ${getColorClass(dept.totalHealthRisk)}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold tracking-tight">{dept.departmentName}</div>
              <div className="text-xs opacity-75 mt-1">{dept.respondentCount}名</div>
            </div>
            <div className="px-3 py-1 text-xs font-medium rounded-full bg-white/20">
              {getRiskLabel(dept.totalHealthRisk)}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-6xl font-bold tracking-tighter">
              {dept.totalHealthRisk ?? '—'}
            </div>
            <div className="text-xs opacity-75 -mt-1">健康リスク</div>
          </div>

          <div className="mt-6 text-center text-xs opacity-75">
            高ストレス率 {dept.highStressRate}%
          </div>
        </div>
      ))}
    </div>
  )
}
