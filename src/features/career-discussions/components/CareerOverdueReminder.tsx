'use client'

import type { CareerOverdueEmployee } from '../types'

interface Props {
  overdueEmployees: CareerOverdueEmployee[]
}

export function CareerOverdueReminder({ overdueEmployees }: Props) {
  if (overdueEmployees.length === 0) return null

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {overdueEmployees.length}
        </span>
        <h3 className="text-sm font-semibold text-orange-800">
          90日以上 キャリア面談未実施の従業員
        </h3>
      </div>
      <ul className="space-y-1.5">
        {overdueEmployees.slice(0, 5).map(emp => (
          <li key={emp.employee_id} className="flex items-center justify-between text-xs">
            <span className="text-slate-700">
              {emp.employee_name}
              {emp.department_name && (
                <span className="ml-1 text-slate-400">({emp.department_name})</span>
              )}
            </span>
            <span className="text-orange-600 font-medium">
              {emp.days_overdue === -1 ? '未実施' : `${emp.days_overdue}日経過`}
            </span>
          </li>
        ))}
        {overdueEmployees.length > 5 && (
          <li className="text-xs text-slate-400">他 {overdueEmployees.length - 5} 名</li>
        )}
      </ul>
    </div>
  )
}
