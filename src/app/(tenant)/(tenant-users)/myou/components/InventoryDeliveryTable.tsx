'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { LotInventoryItem } from '@/features/myou/types'
import { Truck, Package } from 'lucide-react'

interface InventoryDeliveryTableProps {
  items: LotInventoryItem[]
  onDeliverClick: (item: LotInventoryItem) => void
  disabled?: boolean
}

/**
 * 出荷登録「在庫表より」タブ。有効期限・ロット番号・在庫残数の昇順（queries.getLots() 側で
 * 確定済み）に並んだ在庫一覧に「出荷」ボタンを添えて表示する。
 */
export default function InventoryDeliveryTable({
  items,
  onDeliverClick,
  disabled = false,
}: InventoryDeliveryTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">現在、在庫はありません。</p>
      </div>
    )
  }

  const columns: Column<LotInventoryItem>[] = [
    {
      key: 'expiration_date',
      label: '有効期限',
      render: value => value ?? '未設定',
    },
    {
      key: 'lot_no',
      label: 'ロット番号',
      render: value => <span className="font-mono">{value}</span>,
    },
    {
      key: 'quantity_remaining',
      label: '在庫残数',
      render: (value, item) => (
        <span>
          {value} <span className="text-gray-400">/ {item.quantity_total}</span>
        </span>
      ),
    },
    {
      key: 'received_at',
      label: '入庫日付',
      render: value => value ?? '-',
    },
    {
      key: 'id',
      label: '',
      render: (_value, item) => (
        <button
          type="button"
          onClick={() => onDeliverClick(item)}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Truck className="h-3.5 w-3.5" />
          出荷
        </button>
      ),
    },
  ]

  return <DataTable columns={columns} data={items} getRowId={item => item.id} />
}
