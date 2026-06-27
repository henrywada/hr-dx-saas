'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { APP_ROUTES } from '@/config/routes'
import { CATEGORY_LABEL, STATUS_LABEL } from '../labels'
import type { ConsultationCategory, ConsultationQueueItem, ConsultationStatus } from '../types'

interface ConsultationQueueTableProps {
  items: ConsultationQueueItem[]
  /** 詳細ページへのリンク生成関数。省略時は管理者向けキュー詳細を使う */
  detailHref?: (id: string) => string
}

export function ConsultationQueueTable({ items, detailHref }: ConsultationQueueTableProps) {
  const resolveHref = detailHref ?? APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL

  const columns: Column<ConsultationQueueItem>[] = [
    {
      key: 'display_name',
      label: '相談者',
      // DataTable の onRowAction は未配線（DataTable.tsx 自体に呼び出し箇所が無い）ため、
      // セル内リンクで詳細ページへ遷移する。
      render: (value: string, item) => (
        <Link href={resolveHref(item.id)} className="text-(--brand) hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'category',
      label: 'カテゴリ',
      render: (value: ConsultationCategory) => CATEGORY_LABEL[value],
    },
    {
      key: 'claimed_by',
      label: '対応状況',
      render: (value: string | null) => (value ? '対応中' : '未対応'),
    },
    {
      key: 'status',
      label: '状態',
      render: (value: ConsultationStatus) => STATUS_LABEL[value],
    },
    {
      key: 'created_at',
      label: '受付日時',
      render: (value: string) => format(new Date(value), 'M/d (E) HH:mm', { locale: ja }),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      searchable
      searchKey="display_name"
      getRowId={item => item.id}
    />
  )
}
