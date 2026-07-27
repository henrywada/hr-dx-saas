'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MessageSquareHeart } from 'lucide-react'
import type { EmployeePulseHistoryPoint } from '@/features/adm/pulse-stress/queries'

interface Props {
  data: EmployeePulseHistoryPoint[]
}

export function EmployeePulseHistory({ data }: Props) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
        <MessageSquareHeart className="w-4 h-4" />
        パルスサーベイ推移（期間別スコア）
      </h4>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
          回答記録がありません
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              width={28}
            />
            <Tooltip formatter={(v: number) => [`${v}`, 'スコア']} />
            <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
