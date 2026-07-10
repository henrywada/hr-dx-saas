'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { deleteHrLawRefreshLog, deleteAllHrLawRefreshLogs } from '../actions'
import type { HrLawRefreshLog } from '../types'

type Props = {
  logs: HrLawRefreshLog[]
}

export function LawRefreshLogTable({ logs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleDelete(log: HrLawRefreshLog) {
    const when = format(new Date(log.started_at), 'M/d HH:mm', { locale: ja })
    const ok = window.confirm(`${when} のログを削除しますか？`)
    if (!ok) return

    setPendingId(log.id)
    setMessage(null)
    startTransition(async () => {
      const result = await deleteHrLawRefreshLog(log.id)
      if (result.ok === false) {
        setMessage(result.error ?? '削除に失敗しました')
      } else {
        setMessage('ログを削除しました')
      }
      setPendingId(null)
    })
  }

  function handleDeleteAll() {
    if (logs.length === 0) return
    const ok = window.confirm(
      `実施ログをすべて削除しますか？（${logs.length}件以上）\nこの操作は元に戻せません。`
    )
    if (!ok) return

    setPendingId('__all__')
    setMessage(null)
    startTransition(async () => {
      const result = await deleteAllHrLawRefreshLogs()
      if (result.ok === false) {
        setMessage(result.error ?? '一括削除に失敗しました')
      } else {
        setMessage('ログをすべて削除しました')
      }
      setPendingId(null)
    })
  }

  const columns: Column<HrLawRefreshLog>[] = [
    {
      key: 'started_at',
      label: '日時',
      sortable: true,
      render: (value: string) => format(new Date(value), 'M/d (E) HH:mm:ss', { locale: ja }),
    },
    {
      key: 'trigger_type',
      label: '種別',
      render: (value: 'cron' | 'manual') => (value === 'manual' ? '手動' : '週次'),
    },
    {
      key: 'source_topic',
      label: '対象',
      render: (value: string | null, item) =>
        value ?? (item.trigger_type === 'manual' ? '指定トピック' : '全トピック'),
    },
    {
      key: 'success',
      label: '結果',
      render: (value: boolean, item) => {
        if (!value) {
          return (
            <span className="text-xs text-red-600" title={item.error_message ?? undefined}>
              失敗
            </span>
          )
        }
        const noWork =
          item.documents_created === 0 &&
          item.documents_skipped === 0 &&
          item.queued === 0 &&
          (item.documents_updated ?? 0) === 0 &&
          (item.proposals_created ?? 0) === 0
        if (noWork) {
          return (
            <span
              className="text-xs text-amber-700"
              title="例外なく終了したが、登録・スキップ・キュー追加がすべて0件"
            >
              成功（処理なし）
            </span>
          )
        }
        return <span className="text-xs text-emerald-700">成功</span>
      },
    },
    {
      key: 'documents_created',
      label: '登録',
      render: (value: number) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'documents_skipped',
      label: 'スキップ',
      render: (value: number) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'queued',
      label: 'キュー追加',
      render: (value: number) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'detail_chars',
      label: '説明文字数',
      render: (value: number, item) => {
        if (!value || value <= 0) return <span className="text-xs text-[#8b949e]">—</span>
        const avg =
          item.documents_created > 0 ? Math.round(value / item.documents_created) : value
        const label =
          item.documents_created > 1
            ? `約${avg.toLocaleString('ja-JP')}字/件（計${value.toLocaleString('ja-JP')}）`
            : `約${value.toLocaleString('ja-JP')}字`
        return (
          <span className="font-mono text-xs text-[#24292f]" title={`合計 ${value} 文字`}>
            {label}
          </span>
        )
      },
    },
    {
      key: 'error_message',
      label: '詳細',
      render: (value: string | null, item) => {
        const detail =
          value || (item.errors.length > 0 ? item.errors.slice(0, 2).join(' / ') : null)
        return detail ? (
          <span className="text-xs text-[#57606a] line-clamp-2" title={detail}>
            {detail}
          </span>
        ) : (
          '—'
        )
      },
    },
    {
      key: 'id',
      label: '操作',
      render: (_value: string, item) => (
        <button
          type="button"
          disabled={isPending && (pendingId === item.id || pendingId === '__all__')}
          onClick={() => handleDelete(item)}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          削除
        </button>
      ),
    },
  ]

  if (logs.length === 0) {
    return (
      <div className="space-y-2">
        {message && (
          <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
            {message}
          </p>
        )}
        <p className="text-xs text-[#57606a] py-8 text-center border border-[#e2e6ec] rounded-lg bg-white">
          実施ログはまだありません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {message ? (
          <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
            {message}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={handleDeleteAll}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isPending && pendingId === '__all__' ? '削除中…' : 'ログをすべて削除'}
        </button>
      </div>
      <DataTable
        columns={columns}
        data={logs}
        searchable={false}
        getRowId={item => item.id}
        itemsPerPage={20}
      />
    </div>
  )
}
