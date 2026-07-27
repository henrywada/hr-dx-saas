'use client'

import { Activity } from 'lucide-react'
import { ConditionTrendChart } from '@/features/condition-checkin/components/ConditionTrendChart'
import type { ConditionTrendPoint } from '@/features/condition-checkin/types'

interface Props {
  data: ConditionTrendPoint[]
}

export function EmployeeConditionHistory({ data }: Props) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4" />
        コンディション推移（直近30日）
      </h4>
      <ConditionTrendChart data={data} />
    </div>
  )
}
