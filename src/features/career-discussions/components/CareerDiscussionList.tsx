import type { CareerDiscussionRow } from '../types'

interface Props {
  rows: CareerDiscussionRow[]
  /** 一覧内に対象者名を表示するか（管理者向け一覧では表示、本人向け履歴では非表示） */
  showEmployeeName?: boolean
  emptyMessage?: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export function CareerDiscussionList({
  rows,
  showEmployeeName = false,
  emptyMessage = '面談記録はまだありません。',
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{row.theme}</h3>
                <span className="text-xs text-slate-400">{formatDate(row.conducted_at)}</span>
              </div>
              {showEmployeeName && (
                <p className="text-xs text-slate-500">
                  対象者: {row.employee_name}
                  {row.department_name ? `（${row.department_name}）` : ''} / 実施者:{' '}
                  {row.conducted_by_name}
                </p>
              )}
              {row.career_aspiration && (
                <p className="text-xs text-slate-700">
                  <span className="font-semibold">本人のキャリア志向：</span>
                  {row.career_aspiration}
                </p>
              )}
              {row.notes && <p className="text-xs text-slate-600 leading-relaxed">{row.notes}</p>}
              {row.next_date && <p className="text-xs text-slate-500">次回予定: {row.next_date}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
