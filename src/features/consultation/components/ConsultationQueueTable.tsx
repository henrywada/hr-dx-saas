'use client'

import { useRouter } from 'next/navigation'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { APP_ROUTES } from '@/config/routes'
import type { ConsultationQueueItem, ConsultationStatus } from '../types'

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
}

interface ConsultationQueueTableProps {
  items: ConsultationQueueItem[]
}

export function ConsultationQueueTable({ items }: ConsultationQueueTableProps) {
  const router = useRouter()

  const columns: Column<ConsultationQueueItem>[] = [
    { key: 'display_name', label: '相談者' },
    { key: 'category', label: 'カテゴリ' },
    {
      key: 'status',
      label: '状態',
      render: (value: ConsultationStatus) => STATUS_LABEL[value],
    },
    { key: 'created_at', label: '受付日時' },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      searchable
      searchKey="display_name"
      getRowId={item => item.id}
      onRowAction={item => router.push(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(item.id))}
    />
  )
}
