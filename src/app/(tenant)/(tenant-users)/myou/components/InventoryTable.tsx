'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { InventoryItem } from '@/features/myou/types'
import { getDaysUntilExpiration } from '@/features/myou/lib/expiration'
import { Package } from 'lucide-react'

interface InventoryTableProps {
  items: InventoryItem[]
}

export default function InventoryTable({ items }: InventoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">現在、在庫はありません。</p>
        <p className="text-xs text-gray-500 mt-1">
          入荷登録（QRスキャン）を行うと、ここに表示されます。
        </p>
      </div>
    )
  }

  const columns: Column<InventoryItem>[] = [
    {
      key: 'serial_number',
      label: 'シリアル番号',
      sortable: true,
      render: value => <span className="font-mono">{value}</span>,
    },
    {
      key: 'expiration_date',
      label: '有効期限',
      sortable: true,
      render: value => value ?? '未設定',
    },
    {
      key: 'received_at',
      label: '入荷日',
      sortable: true,
      render: value => value ?? '-',
    },
    {
      key: 'status',
      label: '期限状況',
      render: (_value, item) => {
        const daysLeft = getDaysUntilExpiration(item.expiration_date)
        if (daysLeft === null) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              期限未設定
            </span>
          )
        }
        if (daysLeft <= 0) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
              期限切れ
            </span>
          )
        }
        if (daysLeft <= 30) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
              残り{daysLeft}日
            </span>
          )
        }
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
            残り{daysLeft}日
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      searchable={true}
      searchPlaceholder="シリアル番号で検索..."
      searchKey="serial_number"
      getRowId={item => item.serial_number}
    />
  )
}
