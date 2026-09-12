'use client'

import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'

interface OvertimeVsWorkloadChartProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 従業員を1名選択し、月別の残業時間と申告工数を比較する折れ線グラフ */
export function OvertimeVsWorkloadChart({ results }: OvertimeVsWorkloadChartProps) {
  const initialId =
    results.find(r => r.isAttentionNeeded)?.employeeId ?? results[0]?.employeeId ?? ''
  const [selectedId, setSelectedId] = useState(initialId)
  const selected = results.find(r => r.employeeId === selectedId) ?? null

  const chartData = (selected?.months ?? []).map(m => ({
    ym: m.yearMonth,
    overtimeHours: m.overtimeHours,
    loggedHours: m.hasAnyLog ? m.loggedHours : null,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">残業時間 × 申告工数（個人比較）</h2>
        {results.length > 0 && (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            {results.map(r => (
              <option key={r.employeeId} value={r.employeeId}>
                {r.employeeName}
                {r.isAttentionNeeded ? '（要注意）' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      {!selected || chartData.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">表示できるデータがありません。</p>
      ) : (
        <div className="mt-3 h-72 w-full min-w-0 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip
                formatter={(value: number | null, name: string) => [
                  value === null ? 'データなし' : `${value}h`,
                  name === 'overtimeHours' ? '残業時間' : '申告工数',
                ]}
              />
              <Legend formatter={value => (value === 'overtimeHours' ? '残業時間' : '申告工数')} />
              <ReferenceLine
                y={40}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: '40h', fill: '#b45309', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="overtimeHours"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="overtimeHours"
              />
              <Line
                type="monotone"
                dataKey="loggedHours"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="loggedHours"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
