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
} from 'recharts'
import type { GroupData } from '../queries'

interface GroupRadarChartProps {
  data: GroupData
}

export default function GroupRadarChart({ data }: GroupRadarChartProps) {
  const radarData = [
    { subject: '業務量', value: data.workload, fullMark: 100 },
    { subject: 'コントロール', value: data.control, fullMark: 100 },
    { subject: '上司支援', value: data.supervisor_support, fullMark: 100 },
    { subject: '同僚支援', value: data.colleague_support, fullMark: 100 },
  ]

  const hasAnyMetric = radarData.some((d) => d.value != null)
  if (!hasAnyMetric || data.is_suppressed) {
    return (
      <div className="h-[340px] w-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600 px-6 text-center">
        このグループは回答者数が少ないため、職場環境尺度の集団値を表示していません（マスキング）。
      </div>
    )
  }

  const displayRadar = radarData.map((d) => ({ ...d, value: d.value ?? 0 }))

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={displayRadar}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 13 }} />
          <PolarRadiusAxis domain={[0, 100]} tickCount={5} />
          <Radar
            name={data.name}
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
            strokeWidth={4}
            isAnimationActive={false}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
