'use client'

import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ReminderRecord } from '@/features/evaluation/workflow-types'

interface Props {
  records: ReminderRecord[]
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  deadline_approaching: '期限前',
  overdue: '期限超過',
  bulk_nudge: '一括催促',
  rollback_notify: '差し戻し',
}

const REMINDER_TYPE_COLORS: Record<string, string> = {
  deadline_approaching: 'bg-blue-50 text-blue-700',
  overdue: 'bg-red-50 text-red-700',
  bulk_nudge: 'bg-yellow-50 text-yellow-700',
  rollback_notify: 'bg-purple-50 text-purple-700',
}

export function ReminderHistory({ records }: Props) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-400">まだ催促履歴はありません</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              日時
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              対象者
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
              種別
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
              送信者
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-600">
                {format(parseISO(r.sent_at), 'M/d HH:mm', { locale: ja })}
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-800">{r.employee_name}</span>
                {r.message && (
                  <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{r.message}</p>
                )}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REMINDER_TYPE_COLORS[r.reminder_type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {REMINDER_TYPE_LABELS[r.reminder_type] ?? r.reminder_type}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                {r.sent_by_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
