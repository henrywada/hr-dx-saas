'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { GroupData } from '../queries'
import type { DepartmentStat } from '../types'

interface DepartmentChartProps {
  /** 集団分析用（健康リスク・高ストレス率） */
  groups?: GroupData[]
  /** 進捗用（受検済・受検率） */
  departments?: DepartmentStat[]
}

export default function DepartmentChart({ groups, departments }: DepartmentChartProps) {
  const chartData = groups
    ? groups.map((g) => ({
        name: g.name.length > 10 ? g.name.slice(0, 10) + '…' : g.name,
        bar1: g.health_risk,
        bar2: g.high_stress_rate,
        label1: '健康リスク',
        label2: '高ストレス率 (%)',
      }))
    : (departments ?? []).map((d) => ({
        name: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name,
        bar1: d.submitted,
        bar2: d.rate,
        label1: '受検済',
        label2: '受検率 (%)',
      }))

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Bar yAxisId="left" dataKey="bar1" fill="#3b82f6" name={chartData[0]?.label1 ?? '健康リスク'} radius={4} />
          <Bar
            yAxisId="right"
            dataKey="bar2"
            fill="#ef4444"
            name={chartData[0]?.label2 ?? '高ストレス率 (%)'}
            radius={4}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
