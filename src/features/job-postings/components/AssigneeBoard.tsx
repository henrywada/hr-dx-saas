import type { AssigneeTaskCount } from '../types'

interface Props {
  assigneeCounts: AssigneeTaskCount[]
}

export function AssigneeBoard({ assigneeCounts }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gray-200 border-b border-gray-300 px-6 py-4">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">担当者別 残件数</h2>
        <p className="text-sm text-gray-500 mt-0.5">アクティブな候補者の担当状況</p>
      </div>

      <div className="p-4">
        {assigneeCounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            担当者が設定されている候補者がいません
          </div>
        ) : (
          <ul className="space-y-2">
            {assigneeCounts.map(item => {
              const hasStale = item.stale_count > 0
              const staleRatio =
                item.active_count > 0 ? Math.round((item.stale_count / item.active_count) * 100) : 0

              return (
                <li
                  key={item.employee_id}
                  className={[
                    'flex items-center justify-between rounded-lg border px-4 py-3',
                    hasStale ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50',
                  ].join(' ')}
                >
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                    {item.employee_name}
                  </span>

                  <div className="flex items-center gap-3">
                    {hasStale && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium whitespace-nowrap">
                        <span>⚠</span>
                        {item.stale_count}件放置
                        <span className="text-red-400">({staleRatio}%)</span>
                      </span>
                    )}
                    <span
                      className={[
                        'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full text-sm font-bold',
                        hasStale ? 'bg-red-100 text-red-800' : 'bg-primary/10 text-primary',
                      ].join(' ')}
                    >
                      {item.active_count}件
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {assigneeCounts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>合計</span>
            <span className="font-medium text-gray-700">
              {assigneeCounts.reduce((sum, a) => sum + a.active_count, 0)}件
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
