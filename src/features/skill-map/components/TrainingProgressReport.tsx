'use client'

// TrainingPlanView から import される。進捗レポートサブタブ。

import type { TrainingProgressRow } from '../training-plan-types'

interface Props {
  rows: TrainingProgressRow[]
}

function rateColorClass(rate: number | null): string {
  if (rate === null) return 'bg-gray-100 text-gray-500'
  if (rate >= 80) return 'bg-green-100 text-green-700'
  if (rate >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function RateBar({ rate, total }: { rate: number | null; total: number }) {
  if (rate === null || total === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const barColor = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rateColorClass(rate)}`}
      >
        {rate}%
      </span>
    </div>
  )
}

export function TrainingProgressReport({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-400">従業員データがありません</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                従業員名
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                部署
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                eラーニング完了率
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                スキル要件充足率
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                育成計画
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.employee_id}
                className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.employee_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.department_name ?? '—'}</td>
                <td className="px-4 py-3 min-w-[180px]">
                  <div className="space-y-0.5">
                    <RateBar rate={row.el_total > 0 ? row.el_rate : null} total={row.el_total} />
                    {row.el_total > 0 && (
                      <p className="text-xs text-gray-400">
                        {row.el_completed}/{row.el_total} コース
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 min-w-[180px]">
                  <div className="space-y-0.5">
                    <RateBar rate={row.skill_rate} total={row.skill_total} />
                    {row.skill_rate !== null && (
                      <p className="text-xs text-gray-400">
                        {row.skill_completed}/{row.skill_total} 要件
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.active_plan_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
