import type { ElDivisionCompletionRow } from '../assignment-utils'

interface Props {
  rows: ElDivisionCompletionRow[]
}

/** 部署別 eラーニング修了率（EL-S2） */
export function ElDivisionStatsPanel({ rows }: Props) {
  if (rows.length === 0) return null

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-[#e2e6ec] bg-white">
      <div className="border-b border-[#e2e6ec] bg-[#f6f8fa] px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">部署別受講状況</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e6ec] text-left text-xs text-[#57606a]">
              <th className="px-4 py-2 font-medium">部署</th>
              <th className="px-4 py-2 font-medium text-right">割当数</th>
              <th className="px-4 py-2 font-medium text-right">修了</th>
              <th className="px-4 py-2 font-medium text-right">修了率</th>
              <th className="px-4 py-2 font-medium text-right">期限超過</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e6ec]">
            {rows.map(row => (
              <tr key={row.divisionId ?? 'unassigned'} className="hover:bg-[#f6f8fa]">
                <td className="px-4 py-2 text-[#24292f]">{row.divisionName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.assignmentCount}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.completedCount}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.completionRatePercent != null ? `${row.completionRatePercent}%` : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.overdueCount > 0 ? (
                    <span className="text-red-600 font-medium">{row.overdueCount}</span>
                  ) : (
                    '0'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
