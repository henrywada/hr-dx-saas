'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle, Truck } from 'lucide-react'
import type { LotInventoryItem } from '@/features/myou/types'

interface DeliverQuantityModalProps {
  item: LotInventoryItem
  companyName: string
  defaultQuantity: number
  isPending: boolean
  error: string | null
  onClose: () => void
  onConfirm: (quantity: number) => void
}

/**
 * 出荷登録「在庫表より」タブの「出荷」ボタンから開く数量指定モーダル。
 * 在庫残数を超える数量は指定できない。
 */
export default function DeliverQuantityModal({
  item,
  companyName,
  defaultQuantity,
  isPending,
  error,
  onClose,
  onConfirm,
}: DeliverQuantityModalProps) {
  const [quantity, setQuantity] = useState(defaultQuantity)

  const canSubmit = !Number.isNaN(quantity) && quantity >= 1 && quantity <= item.quantity_remaining

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
          <h3 className="text-lg font-bold">出荷処理</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ロット番号</label>
            <input
              type="text"
              value={item.lot_no}
              readOnly
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              出荷先（施工会社）
            </label>
            <input
              type="text"
              value={companyName}
              readOnly
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label
              htmlFor="deliver-quantity"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              出荷数量（在庫残数: {item.quantity_remaining}）
            </label>
            <input
              id="deliver-quantity"
              type="number"
              min={1}
              max={item.quantity_remaining}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onConfirm(quantity)}
            disabled={!canSubmit || isPending}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>処理中...</span>
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                <span>出荷する</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
