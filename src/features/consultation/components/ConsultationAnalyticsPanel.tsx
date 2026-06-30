import {
  CONSULTATION_CATEGORY_LABELS,
  type ConsultationAggregateRow,
} from '../types'

interface Props {
  rows: ConsultationAggregateRow[]
}

export function ConsultationAnalyticsPanel({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        匿名相談の集計データはまだありません。
      </div>
    )
  }

  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-900">匿名相談 集計</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          カテゴリ別・月次件数（個人を特定しない集計のみ）。合計 {total} 件
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/30 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-semibold">年月</th>
              <th className="px-4 py-2 font-semibold">カテゴリ</th>
              <th className="px-4 py-2 font-semibold text-right">件数</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.yearMonth}-${row.category}`} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{row.yearMonth}</td>
                <td className="px-4 py-2 text-slate-800">
                  {CONSULTATION_CATEGORY_LABELS[row.category] ?? row.category}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
