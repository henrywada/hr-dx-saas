'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, AlertCircle, PackageCheck } from 'lucide-react'
import { receiveLot } from '@/features/myou/actions'

interface ReceivingProcessModalProps {
  hasScanned: boolean
  scannedLotNo: string
  scannedSerialNo: string
  onClose: () => void
  onSuccess: (message: { type: 'success' | 'warning'; text: string }) => void
}

/**
 * 入荷処理モーダル。
 * スキャン済みならそのロット番号を起点に数量を加算登録し、未スキャンなら本日日付で
 * 新規ロット番号を採番して数量分を新規ロットとして在庫登録する。
 * QRにシリアルNo（NO:）が含まれる場合は、新規ロット作成時のみあわせて記録する。
 * 有効期限は入荷時には扱わず、出荷登録時に入力する運用とする。
 */
export default function ReceivingProcessModal({
  hasScanned,
  scannedLotNo,
  scannedSerialNo,
  onClose,
  onSuccess,
}: ReceivingProcessModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canSubmit = !Number.isNaN(quantity) && quantity >= 1

  const handleSubmit = () => {
    if (!canSubmit || isPending) return

    setError(null)
    startTransition(async () => {
      const result = await receiveLot({
        scanned_lot_no: hasScanned ? scannedLotNo : undefined,
        scanned_serial_no: hasScanned ? scannedSerialNo : undefined,
        quantity,
      })

      if (result.success) {
        onSuccess({
          type: result.warning ? 'warning' : 'success',
          text:
            result.warning ??
            `入荷処理が完了しました（${result.registered_lot_no} / ${quantity}個）`,
        })
        onClose()
      } else {
        setError(result.error || '入荷処理に失敗しました。')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
          <h3 className="text-lg font-bold">入荷処理</h3>
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
              value={hasScanned ? scannedLotNo : '自動採番されます'}
              readOnly
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label
              htmlFor="receiving-quantity"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              数量（缶の本数）
            </label>
            <input
              id="receiving-quantity"
              type="number"
              min={1}
              max={100000}
              required
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
            onClick={handleSubmit}
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
                <PackageCheck className="h-4 w-4" />
                <span>入荷処理</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
