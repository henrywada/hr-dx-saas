'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toggleHrLawDocumentStatus, deleteHrLawDocument } from '../actions'
import type { HrLawDocument } from '../types'

type Props = {
  documents: HrLawDocument[]
}

export function LawDocumentTable({ documents }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleToggle(doc: HrLawDocument) {
    const nextStatus = doc.status === 'disabled' ? 'published' : 'disabled'
    setPendingId(doc.id)
    setMessage(null)
    startTransition(async () => {
      const result = await toggleHrLawDocumentStatus(doc.id, nextStatus)
      if (result.ok === false) setMessage(result.error ?? '更新に失敗しました')
      setPendingId(null)
    })
  }

  function handleDelete(doc: HrLawDocument) {
    const ok = window.confirm(
      `「${doc.title}」を削除しますか？\n関連する検索用チャンクも削除され、元に戻せません。`
    )
    if (!ok) return

    setPendingId(doc.id)
    setMessage(null)
    startTransition(async () => {
      const result = await deleteHrLawDocument(doc.id)
      if (result.ok === false) {
        setMessage(result.error ?? '削除に失敗しました')
      } else {
        setMessage('削除しました')
      }
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
      key: 'theme',
      label: 'テーマ',
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (value: 'published' | 'disabled' | 'expired') =>
        value === 'published' ? '公開中' : value === 'expired' ? '終了' : '無効化済み',
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isPending && pendingId === item.id}
            onClick={() => handleToggle(item)}
            className="text-xs font-medium text-(--brand) hover:underline disabled:opacity-50"
          >
            {item.status === 'disabled' ? '再公開' : '無効化'}
          </button>
          <button
            type="button"
            disabled={isPending && pendingId === item.id}
            onClick={() => handleDelete(item)}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            削除
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}
      <DataTable
        columns={columns}
        data={documents}
        searchable
        searchKey="title"
        getRowId={item => item.id}
      />
    </div>
  )
}
