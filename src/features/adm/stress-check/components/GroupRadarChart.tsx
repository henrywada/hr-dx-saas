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

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
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
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
