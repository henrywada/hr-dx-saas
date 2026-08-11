'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { LotInventoryItem } from '@/features/myou/types'
import { Package } from 'lucide-react'

interface InventoryTableProps {
  items: LotInventoryItem[]
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

  const columns: Column<LotInventoryItem>[] = [
    {
      key: 'received_at',
      label: '入荷日',
      sortable: true,
      render: value => value ?? '-',
    },
    {
      key: 'lot_no',
      label: 'ロット番号',
      sortable: true,
      render: value => <span className="font-mono">{value}</span>,
    },
    {
      key: 'serial_no',
      label: 'NO',
      sortable: true,
      render: value => value ?? '-',
    },
    {
      key: 'quantity_remaining',
      label: '残数',
      sortable: true,
      render: (value, item) => (
        <span>
          {value} <span className="text-gray-400">/ {item.quantity_total}</span>
        </span>
      ),
    },
  ]

  const totalRemaining = items.reduce((sum, item) => sum + item.quantity_remaining, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity_total, 0)

  const footer = (
    <tr className="bg-accent-teal border-t-2 border-[#e2e6ec] font-semibold">
      <td className="px-4 py-1 text-sm text-[#24292f]">合計</td>
      <td className="px-4 py-1" />
      <td className="px-4 py-1" />
      <td className="px-4 py-1 text-sm text-[#24292f]">
        {totalRemaining} <span className="text-gray-400">/ {totalQuantity}</span>
      </td>
    </tr>
  )

  return (
    <DataTable
      columns={columns}
      data={items}
      searchable={true}
      searchPlaceholder="ロット番号で検索..."
      searchKey="lot_no"
      getRowId={item => item.id}
      footer={footer}
    />
  )
}
