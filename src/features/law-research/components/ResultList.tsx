'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ResearchHit } from '../types'

export function ResultList({
  hits,
  selectedId,
  onSelect,
}: {
  hits: ResearchHit[]
  selectedId: string | null
  onSelect: (hit: ResearchHit) => void
}) {
  const columns: Column<ResearchHit>[] = [
    {
      key: 'title',
      label: 'タイトル',
      render: (value, item) => (
        <button
          type="button"
          onClick={() => onSelect(item)}
          className={`text-left hover:underline ${
            item.id === selectedId ? 'text-[#FD7601] font-medium' : 'text-slate-900'
          }`}
        >
          {String(value)}
        </button>
      ),
    },
    { key: 'identifier', label: '番号', width: 'w-56' },
    { key: 'dateLabel', label: '日付', width: 'w-32' },
    {
      key: 'summary',
      label: '要旨',
      render: value => {
        const text = String(value ?? '')
        return (
          <span className="text-slate-600">
            {text.length > 80 ? `${text.slice(0, 80)}…` : text}
          </span>
        )
      },
    },
  ]

  if (hits.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        検索条件を入力して検索してください。
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={hits}
      searchable={false}
      itemsPerPage={20}
      getRowId={item => item.id}
    />
  )
}
