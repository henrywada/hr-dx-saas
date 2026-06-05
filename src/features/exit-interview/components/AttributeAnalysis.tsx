'use client'

import type { ExitInterviewAnalytics } from '@/features/exit-interview/types'
import {
  MAIN_REASON_LABELS,
  MAIN_REASON_COLORS,
  AGE_GROUP_LABELS,
} from '@/features/exit-interview/types'

interface Props {
  analytics: ExitInterviewAnalytics
}

function SimpleBar({ count, max, color }: { count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{count}</span>
    </div>
  )
}

export function AttributeAnalysis({ analytics }: Props) {
  const { department_breakdown, tenure_breakdown, age_breakdown } = analytics
  const deptMax = Math.max(...department_breakdown.map(d => d.count), 1)
  const tenureMax = Math.max(...tenure_breakdown.map(t => t.count), 1)
  const ageMax = Math.max(...age_breakdown.map(a => a.count), 1)

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">部署別（上位10）</h4>
        {department_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {department_breakdown.map(d => (
            <div key={d.department_name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-700 truncate max-w-[120px]">
                  {d.department_name}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-white shrink-0"
                  style={{ backgroundColor: MAIN_REASON_COLORS[d.top_reason] }}
                >
                  {MAIN_REASON_LABELS[d.top_reason]}
                </span>
              </div>
              <SimpleBar count={d.count} max={deptMax} color="#0055ff" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">在籍年数別</h4>
        {tenure_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {tenure_breakdown.map(t => (
            <div key={t.tenure_group}>
              <p className="text-xs text-slate-700 mb-0.5">{t.tenure_group}</p>
              <SimpleBar count={t.count} max={tenureMax} color="#10b981" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">年齢層別</h4>
        {age_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {age_breakdown.map(a => (
            <div key={a.age_group}>
              <p className="text-xs text-slate-700 mb-0.5">{AGE_GROUP_LABELS[a.age_group]}</p>
              <SimpleBar count={a.count} max={ageMax} color="#f59e0b" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
