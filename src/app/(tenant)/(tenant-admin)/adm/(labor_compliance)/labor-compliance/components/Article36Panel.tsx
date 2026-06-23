'use client'

import type { Article36SubjectRow } from '@/features/labor-compliance/types'

type Props = { rows: Article36SubjectRow[] }

export function Article36Panel({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-green-600 font-medium text-lg">✓ 36協定特別条項の対象者はいません</p>
        <p className="text-gray-400 text-sm mt-2">
          直近12ヶ月に月100時間超または年360時間超の残業アラートがありません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
        <span className="font-medium">36協定特別条項（労基法36条5項）</span>：
        臨時的な特別の事情があっても、年6回まで・月100時間未満・年720時間以内の上限があります。
        以下は直近12ヶ月に月100時間超または年360時間超アラートが発生した従業員です。
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">36協定特別条項の対象者</h2>
          <span className="text-xs text-gray-500">{rows.length} 名</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">社員番号</th>
                <th className="px-4 py-3 text-left font-medium">氏名</th>
                <th className="px-4 py-3 text-left font-medium">部署</th>
                <th className="px-4 py-3 text-center font-medium">月100h超（回）</th>
                <th className="px-4 py-3 text-center font-medium">月45h超（回）</th>
                <th className="px-4 py-3 text-center font-medium">年360h超</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.employeeId} className="hover:bg-gray-50 bg-red-50/10">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{row.employeeNo ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.divisionName}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        row.monthOver100Count >= 6
                          ? 'bg-red-100 text-red-700'
                          : row.monthOver100Count >= 3
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {row.monthOver100Count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-700 tabular-nums">{row.monthOver45Count}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.hasAnnualExceeded ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        超過
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
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
