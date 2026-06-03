'use client'

import type { OvertimeAlertDisplayRow } from '@/features/labor-compliance/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type Props = { alerts: OvertimeAlertDisplayRow[] }

const SEVERITY_STYLES: Record<string, { badge: string; row: string }> = {
  critical: {
    badge: 'bg-red-100 text-red-700 border border-red-200',
    row: 'bg-red-50/30',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    row: 'bg-amber-50/30',
  },
  caution: {
    badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    row: '',
  },
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: '緊急',
  warning: '警告',
  caution: '注意',
}

export function OvertimeAlertPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-green-600 font-medium text-lg">✓ 未解決の残業アラートはありません</p>
        <p className="text-gray-400 text-sm mt-2">すべての従業員が法令基準内で勤務しています</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">未解決の残業アラート</h2>
        <span className="text-xs text-gray-500">{alerts.length} 件</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium">重要度</th>
              <th className="px-4 py-3 text-left font-medium">社員番号</th>
              <th className="px-4 py-3 text-left font-medium">氏名</th>
              <th className="px-4 py-3 text-left font-medium">部署</th>
              <th className="px-4 py-3 text-left font-medium">アラート種別</th>
              <th className="px-4 py-3 text-left font-medium">発生日時</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alerts.map(alert => {
              const styles = SEVERITY_STYLES[alert.severityLevel] ?? SEVERITY_STYLES.caution
              const triggeredDate = alert.triggeredAt
                ? format(new Date(alert.triggeredAt), 'M月d日', { locale: ja })
                : '—'
              return (
                <tr key={alert.id} className={`hover:bg-gray-50 transition-colors ${styles.row}`}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}
                    >
                      {SEVERITY_LABELS[alert.severityLevel]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {alert.employeeNo ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{alert.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{alert.divisionName}</td>
                  <td className="px-4 py-3 text-gray-700">{alert.alertTypeLabel}</td>
                  <td className="px-4 py-3 text-gray-500">{triggeredDate}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
