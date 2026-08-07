'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DeliveryBatchView } from '@/features/grant-notifier/queries'
import { formatJstDate } from '@/features/grant-notifier/components/format'

/**
 * 配信アーカイブ一覧。実際に送信したメール（送信バッチ）単位で表示し、
 * 「本文を見る」でオリジナルのメール文をモーダル表示する。
 */

interface ArchiveDeliveryTableProps {
  batches: DeliveryBatchView[]
}

export function ArchiveDeliveryTable({ batches }: ArchiveDeliveryTableProps) {
  const [active, setActive] = useState<DeliveryBatchView | null>(null)

  const columns: Column<DeliveryBatchView>[] = [
    {
      key: 'sentAt',
      label: '送信日',
      sortable: true,
      width: 'w-32',
      render: value => <span className="font-mono text-xs">{formatJstDate(value)}</span>,
    },
    {
      key: 'subject',
      label: 'メール件名',
      width: 'w-64',
      render: value => <span className="text-xs font-medium text-slate-900">{value}</span>,
    },
    {
      key: 'summary',
      label: 'メールメッセージのまとめ',
      render: value => (
        <span className="line-clamp-3 whitespace-pre-line text-xs text-slate-600">{value}</span>
      ),
    },
    {
      key: 'grantCount',
      label: '件数',
      width: 'w-20',
      render: value => <span className="font-mono text-xs">{value}件</span>,
    },
    {
      key: 'html',
      label: '',
      width: 'w-28',
      render: (_value, item) => (
        <button
          type="button"
          onClick={() => setActive(item)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#FD7601] hover:text-[#FD7601]"
        >
          <Mail className="h-3.5 w-3.5" strokeWidth={2} />
          本文を見る
        </button>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-[#FD7601]">助成金情報配信</p>
          <h1 className="text-xl font-semibold text-slate-900">配信アーカイブ</h1>
          <p className="text-sm text-slate-500">
            過去に送信したメールの原文を確認できます。助成金ごとの判定理由は詳細画面で参照できます。
          </p>
        </div>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          助成金情報配信
        </Link>
      </header>

      {batches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">配信履歴はまだありません</p>
          <p className="mt-1 text-xs text-slate-500">
            条件に合う新着助成金が見つかると、週次でメールが送信されここに追加されます。
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
          <DataTable
            columns={columns}
            data={batches}
            searchable
            searchKey="subject"
            searchPlaceholder="件名で検索..."
            getRowId={item => item.sentAt}
          />
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={open => !open && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          {active && (
            <>
              <DialogHeader>
                <p className="font-mono text-xs text-slate-500">
                  送信日: {formatJstDate(active.sentAt)}
                </p>
                <DialogTitle>{active.subject}</DialogTitle>
              </DialogHeader>
              {/* 表示するのは buildDigest が自前で生成したメール HTML（外部入力は
                  escapeHtml 済み）のため、原文を再現する目的でそのまま描画する */}
              <div
                className="overflow-y-auto px-6 py-5 text-sm sm:px-8"
                dangerouslySetInnerHTML={{ __html: active.html }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
