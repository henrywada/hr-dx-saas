'use client'

import { Clock3 } from 'lucide-react'
import type { MonthlyStatusResult } from '@/utils/overtimeThresholds'
import { STATUS_LABELS, STATUS_BG_CLASSES } from '@/utils/overtimeThresholds'

interface Props {
  data: MonthlyStatusResult[]
}

export function EmployeeOvertimeHistory({ data }: Props) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
        <Clock3 className="w-4 h-4" />
        残業時間履歴（直近{data.length}ヶ月）
      </h4>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
          残業実績がありません
        </div>
      ) : (
        <ul className="space-y-1.5">
          {[...data].reverse().map(m => (
            <li
              key={m.yearMonth}
              className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-0"
            >
              <span className="text-slate-600 font-mono">{m.yearMonth}</span>
              <span className="text-slate-800">{m.totalHours.toFixed(1)} h</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_BG_CLASSES[m.status]}`}
              >
                {STATUS_LABELS[m.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
