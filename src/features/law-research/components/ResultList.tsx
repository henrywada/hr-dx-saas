'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ResearchHit } from '../types'

/** 法律の種別名ではなく、人事が見て資料の出所が分かるラベルにする */
function sourceLabelOf(hit: ResearchHit): string {
  if (hit.sourceLabel) return hit.sourceLabel
  switch (hit.ref.kind) {
    case 'law_article':
    case 'law_toc':
    case 'tax_law_article':
    case 'tax_law_toc':
      return '法令'
    case 'mhlw_tsutatsu':
      return '厚労省通知'
    case 'jaish_tsutatsu':
      return '安全衛生通知'
    case 'tax_tsutatsu':
    case 'tax_tsutatsu_toc':
      return '税務通達'
    case 'saiketsu':
      return '裁決事例'
    default:
      return '資料'
  }
}

type ResultRow = ResearchHit & { sourceLabel: string }

export function ResultList({
  hits,
  hasSearched,
  selectedId,
  onSelect,
  onBackToHistory,
}: {
  hits: ResearchHit[]
  hasSearched: boolean
  selectedId: string | null
  onSelect: (hit: ResearchHit) => void
  onBackToHistory: () => void
}) {
  const rows: ResultRow[] = hits.map(hit => ({ ...hit, sourceLabel: sourceLabelOf(hit) }))

  const columns: Column<ResultRow>[] = [
    {
      key: 'title',
      label: '検索結果',
      render: (_value, item) => {
        const summary = String(item.summary ?? '')
        const summaryText = summary.length > 80 ? `${summary.slice(0, 80)}…` : summary
        const meta = [item.dateLabel, item.identifier, summaryText].filter(text => text.trim())
        const selected = item.id === selectedId

        return (
          <button type="button" onClick={() => onSelect(item)} className="w-full text-left py-1">
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="shrink-0 text-[11px] text-slate-500">{item.sourceLabel}</span>
              <span
                className={`text-sm hover:underline ${
                  selected ? 'text-[#FD7601] font-medium' : 'text-slate-900'
                }`}
              >
                {item.title}
              </span>
            </span>
            {meta.length > 0 && (
              <span className="mt-0.5 block text-[11px] text-slate-500 truncate">
                {meta.join('　')}
              </span>
            )}
          </button>
        )
      },
    },
  ]

  const backButton = (
    <button
      type="button"
      onClick={onBackToHistory}
      className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 normal-case tracking-normal"
    >
      ← 戻る
    </button>
  )

  if (hits.length === 0) {
    if (!hasSearched) return null
    return (
      <div className="rounded-lg border border-red-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-1 bg-[#f6f8fa] border-b border-red-200">
          <span className="text-xs font-semibold text-[#24292f]">検索結果</span>
          {backButton}
        </div>
        <div className="bg-red-50 p-8 text-center text-xs text-red-700">
          該当する原文が見つかりませんでした。別の言い方で試してみてください。
        </div>
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable={false}
      itemsPerPage={20}
      getRowId={item => item.id}
      headerAction={backButton}
    />
  )
}
