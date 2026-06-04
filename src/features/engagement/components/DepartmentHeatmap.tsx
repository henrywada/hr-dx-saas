'use client'

import type { DepartmentEngagementRow } from '../types'

interface Props {
  departments: DepartmentEngagementRow[]
}

const STATUS_STYLE: Record<
  DepartmentEngagementRow['status'],
  { bg: string; text: string; badge: string; label: string }
> = {
  good:    { bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',   label: '良好' },
  caution: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: '要注意' },
  alert:   { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',        label: 'アラート' },
}

function ScoreCell({
  value,
  suffix,
  invert,
}: {
  value: number | null
  suffix: string
  invert?: boolean
}) {
  if (value === null) return <span className="text-gray-300">—</span>
  const isWarning = invert ? value >= 20 : value < 50
  return (
    <span className={isWarning ? 'font-semibold text-red-600' : 'font-semibold text-gray-800'}>
      {suffix === 'pt' ? value.toFixed(1) : value}
      {suffix}
    </span>
  )
}

export function DepartmentHeatmap({ departments }: Props) {
  if (departments.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">
        部署データなし
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-200 text-left text-xs font-semibold text-gray-600">
            <th className="px-4 py-3">部署名</th>
            <th className="px-4 py-3 text-center">
              パルス
              <br />
              <span className="font-normal text-gray-400">（0〜5.0）</span>
            </th>
            <th className="px-4 py-3 text-center">
              高ストレス率
              <br />
              <span className="font-normal text-gray-400">（低いほど良）</span>
            </th>
            <th className="px-4 py-3 text-center">
              アンケート
              <br />
              回答率
            </th>
            <th className="px-4 py-3 text-center">総合スコア</th>
            <th className="px-4 py-3 text-center">状態</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, i) => {
            const st = STATUS_STYLE[dept.status]
            return (
              <tr
                key={dept.divisionId}
                className={`border-t border-gray-100 transition-shadow hover:shadow-sm ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-800">{dept.divisionName}</td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.pulseScore} suffix="pt" />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.highStressRate} suffix="%" invert />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.questionnaireResponseRate} suffix="%" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className={`inline-block rounded px-2 py-0.5 font-bold ${st.bg} ${st.text}`}>
                    {dept.compositeScore}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${st.badge}`}>
                    {st.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
