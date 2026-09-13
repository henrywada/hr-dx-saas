'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import TenantBackLink from '@/components/common/TenantBackLink'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { APP_ROUTES } from '@/config/routes'
import { formatJstDate } from '@/features/grant-notifier/components/format'
import type { NotionInfoBoardData } from '../queries'
import type { NotionInfoItem, NotionInfoTab } from '../types'
import { BodyModal } from './BodyModal'
import { TabRadioGroup } from './TabRadioGroup'

function parseTab(value: string | null | undefined): NotionInfoTab {
  return value === 'grant' || value === 'ai' || value === 'hr_trend' ? value : 'hr_trend'
}

function ExternalUrl({ url }: { url: string | null }) {
  if (!url) return <span className="text-xs text-slate-400">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
    >
      {url}
    </a>
  )
}

export function NotionInfoBoardClient({
  initialTab,
  data,
}: {
  initialTab: NotionInfoTab
  data: NotionInfoBoardData
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = parseTab(searchParams.get('tab') ?? initialTab)
  const [active, setActive] = useState<NotionInfoItem | null>(null)

  const handleTabChange = (next: NotionInfoTab) => {
    router.replace(`${APP_ROUTES.TENANT.ADMIN_NOTION_INFO}?tab=${next}`, { scroll: false })
  }

  const commonColumns: Column<NotionInfoItem>[] = [
    {
      key: 'collectedAt',
      label: '日付',
      sortable: true,
      width: 'w-32',
      render: value => <span className="font-mono text-xs">{formatJstDate(value)}</span>,
    },
    {
      key: 'title',
      label: 'タイトル',
      render: value => <span className="text-xs font-medium text-slate-900">{value}</span>,
    },
    {
      key: 'summary',
      label: '要約',
      render: value => (
        <span className="line-clamp-3 whitespace-pre-line text-xs text-slate-600">{value}</span>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      render: value => <ExternalUrl url={value} />,
    },
  ]

  const grantColumns: Column<NotionInfoItem>[] = [
    {
      key: 'amount',
      label: '助成金額',
      render: value => <span className="text-xs text-slate-700">{value || '—'}</span>,
    },
    {
      key: 'openDate',
      label: '募集開始日',
      render: value => <span className="font-mono text-xs">{formatJstDate(value)}</span>,
    },
    {
      key: 'deadline',
      label: '募集期限',
      render: value => <span className="font-mono text-xs">{formatJstDate(value)}</span>,
    },
    {
      key: 'category',
      label: '区分',
      render: value => <span className="text-xs text-slate-700">{value || '—'}</span>,
    },
  ]

  const actionColumn: Column<NotionInfoItem> = {
    key: 'body',
    label: '',
    width: 'w-24',
    render: (_value, item) => {
      const disabled = item.body.trim() === ''
      return (
        <button
          type="button"
          disabled={disabled}
          title={disabled ? '本文がありません' : undefined}
          onClick={() => setActive(item)}
          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#FD7601] hover:text-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-700"
        >
          要約
        </button>
      )
    },
  }

  const columns =
    tab === 'grant'
      ? [...commonColumns, ...grantColumns, actionColumn]
      : [...commonColumns, actionColumn]

  const items = data.items[tab]
  const showWarning = !data.configured || Boolean(data.errorMessage)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">情報掲示板</h1>
          <p className="mt-1 text-sm text-slate-500">
            Notion に収集した人事トレンド・助成金・AI 最新情報を閲覧できます。
          </p>
        </div>
        <TenantBackLink />
      </div>

      <TabRadioGroup value={tab} onChange={handleTabChange} />

      {showWarning ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="text-sm text-amber-900">
            {data.errorMessage ?? '情報掲示板の接続設定がありません。運営者に連絡してください。'}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">この分類の情報はまだありません</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
          <DataTable
            columns={columns}
            data={items}
            searchable
            searchKey="title"
            searchPlaceholder="タイトルで検索..."
            getRowId={item => item.id}
          />
        </div>
      )}

      <BodyModal
        open={active !== null}
        onOpenChange={open => !open && setActive(null)}
        title={active?.title ?? ''}
        body={active?.body ?? ''}
      />
    </div>
  )
}
