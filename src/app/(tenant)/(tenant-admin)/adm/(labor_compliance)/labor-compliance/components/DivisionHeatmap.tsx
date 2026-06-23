'use client'

import type { DivisionHeatmapRow } from '@/features/labor-compliance/types'

type Props = { rows: DivisionHeatmapRow[] }

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

function getOvertimeHeatColor(avgMinutes: number): string {
  if (avgMinutes >= 80 * 60) return 'bg-red-500 text-white'
  if (avgMinutes >= 45 * 60) return 'bg-amber-400 text-white'
  if (avgMinutes >= 20 * 60) return 'bg-yellow-200 text-gray-800'
  return 'bg-green-100 text-gray-700'
}

function getPaidLeaveHeatColor(rate: number): string {
  if (rate >= 80) return 'bg-green-100 text-gray-700'
  if (rate >= 50) return 'bg-yellow-200 text-gray-800'
  if (rate >= 30) return 'bg-amber-400 text-white'
  return 'bg-red-500 text-white'
}

export function DivisionHeatmap({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-gray-500">部署データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 凡例 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">残業時間（平均）凡例</p>
        <div className="flex gap-3 flex-wrap text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-100 border border-green-200" /> 20h未満
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-200 border border-yellow-300" /> 20〜45h
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-amber-400" /> 45〜80h（法的リスク）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-500" /> 80h超（特別条項上限接近）
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">部署別ヒートマップ</h2>
          <p className="text-xs text-gray-500 mt-1">残業率・有休取得率を部署単位で比較</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">部署名</th>
                <th className="px-4 py-3 text-center font-medium">人数</th>
                <th className="px-4 py-3 text-center font-medium">平均残業時間</th>
                <th className="px-4 py-3 text-center font-medium">法令リスク者数</th>
                <th className="px-4 py-3 text-center font-medium">有休義務達成率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.divisionId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.divisionName}</td>
                  <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                    {row.employeeCount}名
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold tabular-nums ${getOvertimeHeatColor(row.avgOvertimeMinutes)}`}
                    >
                      {minutesToHours(row.avgOvertimeMinutes)}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.legalRiskCount > 0 ? (
                      <span className="inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold bg-red-100 text-red-700">
                        {row.legalRiskCount}名
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium text-sm">なし</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded px-3 py-1 text-sm font-bold tabular-nums ${getPaidLeaveHeatColor(row.paidLeaveComplianceRate)}`}
                    >
                      {row.paidLeaveComplianceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
