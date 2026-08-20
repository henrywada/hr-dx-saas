'use client'

import { Trash2 } from 'lucide-react'

import type { ResearchHistoryRow, ResearchMode, ResearchSubTab } from '../types'

const MODE_LABEL: Record<ResearchMode, string> = {
  tax: '税法',
  labor: '労務法',
  law: '法令',
}

/** 「第◯条」形式で表示するサブタブ（条文系）。通達番号系は番号をそのまま併記する */
const ARTICLE_SUB_TABS: ResearchSubTab[] = ['tax_article', 'labor_article', 'law_article']

/** 履歴行の表示文言を組み立てる。条番号・通達番号があれば併記する */
function formatHistoryLabel(row: ResearchHistoryRow): string {
  if (!row.article) return row.keyword
  if (ARTICLE_SUB_TABS.includes(row.sub_tab)) return `${row.keyword} 第${row.article}条`
  return `${row.keyword} ${row.article}`
}

export function HistoryPanel({
  rows,
  pendingId,
  onPick,
  onDelete,
}: {
  rows: ResearchHistoryRow[]
  pendingId: string | null
  onPick: (row: ResearchHistoryRow) => void
  onDelete: (id: string) => void
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
          <li key={row.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPick(row)}
              className="min-w-0 flex-1 text-left py-1.5 hover:bg-slate-50 flex items-center gap-2"
            >
              <span className="text-[11px] text-slate-400 w-14 shrink-0">
                {MODE_LABEL[row.mode] ?? row.mode}
              </span>
              <span className="text-xs text-slate-800 truncate flex-1">
                {formatHistoryLabel(row)}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{row.result_count}件</span>
            </button>
            <button
              type="button"
              aria-label="この履歴を削除"
              disabled={pendingId === row.id}
              onClick={() => onDelete(row.id)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
