'use client'

import type { OverdueEmployee } from '../types'

interface Props {
  overdueEmployees: OverdueEmployee[]
}

export function ReminderBadge({ overdueEmployees }: Props) {
  if (overdueEmployees.length === 0) return null

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {overdueEmployees.length}
        </span>
        <h3 className="text-sm font-semibold text-orange-800">30日以上 1on1 未実施の部下</h3>
      </div>
      <ul className="space-y-1.5">
        {overdueEmployees.slice(0, 5).map(emp => (
          <li key={emp.employee_id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {emp.employee_name}
              {emp.department_name && (
                <span className="ml-1.5 text-gray-400">({emp.department_name})</span>
              )}
            </span>
            <span className="text-orange-600 font-medium">
              {emp.days_overdue === -1 ? '未実施' : `${emp.days_overdue}日経過`}
            </span>
          </li>
        ))}
        {overdueEmployees.length > 5 && (
          <li className="text-xs text-gray-400">他 {overdueEmployees.length - 5} 名</li>
        )}
      </ul>
    </div>
  )
}
