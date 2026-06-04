'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { SessionRow } from '../types'

interface Props {
  sessions: SessionRow[]
}

export function SessionHistoryTable({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        記録がありません — 「記録する」ボタンから初回の1on1を登録してください
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">実施日</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">部下</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">管理職</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">テーマ</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">前回からの経過</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">次回予定</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sessions.map(s => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {format(new Date(s.conducted_at), 'M/d (E)', { locale: ja })}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{s.employee_name}</span>
                {s.department_name && (
                  <span className="ml-1.5 text-xs text-gray-400">{s.department_name}</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{s.manager_name}</td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {s.theme}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {s.days_since_last === null
                  ? <span className="text-xs text-gray-300">初回</span>
                  : <span className={s.days_since_last >= 30 ? 'text-orange-500 font-medium' : ''}>
                      {s.days_since_last}日
                    </span>
                }
              </td>
              <td className="px-4 py-3 text-gray-500">
                {s.next_date
                  ? format(new Date(s.next_date), 'M/d', { locale: ja })
                  : <span className="text-xs text-gray-300">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
