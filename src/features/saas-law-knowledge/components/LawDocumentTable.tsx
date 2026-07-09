'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toggleHrLawDocumentStatus } from '../actions'
import type { HrLawDocument } from '../types'

type Props = {
  documents: HrLawDocument[]
}

export function LawDocumentTable({ documents }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleToggle(doc: HrLawDocument) {
    const nextStatus = doc.status === 'published' ? 'disabled' : 'published'
    setPendingId(doc.id)
    startTransition(async () => {
      await toggleHrLawDocumentStatus(doc.id, nextStatus)
      setPendingId(null)
    })
  }

  const columns: Column<HrLawDocument>[] = [
    {
      key: 'title',
      label: 'タイトル',
      render: (value: string, item) => (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--brand) hover:underline"
        >
          {value}
        </a>
      ),
    },
    {
      key: 'topic',
      label: 'トピック',
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (value: 'published' | 'disabled') =>
        value === 'published' ? '公開中' : '無効化済み',
    },
    {
      key: 'fetched_at',
      label: '取得日時',
      render: (value: string) => format(new Date(value), 'M/d (E) HH:mm', { locale: ja }),
    },
    {
      key: 'id',
      label: '操作',
      render: (_value: string, item) => (
        <button
          type="button"
          disabled={isPending && pendingId === item.id}
          onClick={() => handleToggle(item)}
          className="text-xs font-medium text-(--brand) hover:underline disabled:opacity-50"
        >
          {item.status === 'published' ? '無効化' : '再公開'}
        </button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={documents}
      searchable
      searchKey="title"
      getRowId={item => item.id}
    />
  )
}
