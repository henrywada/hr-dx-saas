'use client'

import type { PaidLeaveProgressRow } from '@/features/labor-compliance/types'

type Props = {
  rows: PaidLeaveProgressRow[]
  yearMonth: string
}

export function PaidLeavePanel({ rows, yearMonth }: Props) {
  const [y, m] = yearMonth.split('-').map(Number)
  const fiscalYear = m >= 4 ? y : y - 1
  const fiscalEndDate = `${fiscalYear + 1}年3月`

  const atRiskRows = rows.filter(r => r.atRisk)
  const safeRows = rows.filter(r => !r.atRisk)

  return (
    <div className="space-y-4">
      {/* 注意書き */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">年5日有休取得義務（労基法39条7項）</span>：{fiscalYear}年4月〜
        {fiscalEndDate}の期間で年5日以上の有休取得が必要です。
        work_time_recordsのis_holiday=trueの日数を取得日数として集計しています。
      </div>

      {/* リスクあり */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">未達リスクあり</h2>
          <span className="ml-auto text-xs text-gray-500">{atRiskRows.length} 名</span>
        </div>
        {atRiskRows.length === 0 ? (
          <p className="px-6 py-8 text-center text-green-600 font-medium">
            ✓ 全員が義務取得日数を達成しています
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">社員番号</th>
                  <th className="px-4 py-3 text-left font-medium">氏名</th>
                  <th className="px-4 py-3 text-left font-medium">部署</th>
                  <th className="px-4 py-3 text-left font-medium">取得日数</th>
                  <th className="px-4 py-3 text-left font-medium">進捗</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atRiskRows.map(row => {
                  const pct = Math.min(100, Math.round((row.takenDays / 5) * 100))
                  return (
                    <tr key={row.employeeId} className="hover:bg-gray-50 bg-amber-50/20">
                      <td className="px-4 py-3 text-gray-500 tabular-nums">
                        {row.employeeNo ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="font-bold text-amber-700">{row.takenDays}</span>
                        <span className="text-gray-400 text-xs"> / 5日</span>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 達成済み（折りたたみ可能） */}
      <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          達成済み（{safeRows.length} 名）
        </summary>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">社員番号</th>
                <th className="px-4 py-3 text-left font-medium">氏名</th>
                <th className="px-4 py-3 text-left font-medium">部署</th>
                <th className="px-4 py-3 text-left font-medium">取得日数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {safeRows.map(row => (
                <tr key={row.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{row.employeeNo ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="font-bold text-green-600">{row.takenDays}</span>
                    <span className="text-gray-400 text-xs"> / 5日</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
