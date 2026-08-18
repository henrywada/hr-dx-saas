'use client'

import type { ResearchHistoryRow, ResearchMode } from '../types'

const MODE_LABEL: Record<ResearchMode, string> = {
  tax: '税法',
  labor: '労務法',
  law: '法令',
}

export function HistoryPanel({
  rows,
  onPick,
}: {
  rows: ResearchHistoryRow[]
  onPick: (row: ResearchHistoryRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">
        検索履歴はまだありません。
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
      <h3 className="text-sm font-medium text-slate-900">検索履歴</h3>
      <ul className="divide-y divide-slate-100">
        {rows.map(row => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onPick(row)}
              className="w-full text-left py-1.5 hover:bg-slate-50 flex items-center gap-2"
            >
              <span className="text-[11px] text-slate-400 w-14 shrink-0">
                {MODE_LABEL[row.mode] ?? row.mode}
              </span>
              <span className="text-xs text-slate-800 truncate flex-1">{row.keyword}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{row.result_count}件</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
