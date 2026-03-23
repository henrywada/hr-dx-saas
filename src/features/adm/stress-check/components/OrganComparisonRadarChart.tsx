'use client'

import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import type { GroupAnalysisDepartment, GroupAnalysisSummary } from '../types'

interface OrganComparisonRadarChartProps {
  departments: GroupAnalysisDepartment[]
  summary: GroupAnalysisSummary
}

const RADAR_KEYS = [
  { key: 'workloadQuantity', label: '負担(量)' },
  { key: 'control', label: 'コントロール' },
  { key: 'supervisorSupport', label: '上司サポート' },
  { key: 'coworkerSupport', label: '同僚サポート' },
] as const

export default function OrganComparisonRadarChart({
  departments,
  summary,
}: OrganComparisonRadarChartProps) {
  const visibleDepts = departments.filter((d) => !d.isMasked)
  if (visibleDepts.length === 0) {
    return (
      <div className="h-[340px] flex items-center justify-center text-gray-500">
        表示可能な部署がありません
      </div>
    )
  }

  const radarData = RADAR_KEYS.map(({ key, label }) => {
    const avg =
      visibleDepts.reduce(
        (s, d) => s + ((d.scaleAverages[key] as number) ?? 0),
        0
      ) / visibleDepts.length
    return {
      subject: label,
      '全社平均': (summary.overallScaleAverages[key] as number) ?? 0,
      '部署平均': avg,
      fullMark: 100,
    }
  })

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 13 }} />
          <PolarRadiusAxis domain={[0, 100]} tickCount={5} />
          <Radar
            name="全社平均"
            dataKey="全社平均"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Radar
            name="部署平均"
            dataKey="部署平均"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
