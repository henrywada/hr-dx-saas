'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { updateDeliveryUsedQuantity } from '@/features/myou/actions'
import type { DeliveryHistoryRow } from '@/features/myou/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: Pick<DeliveryHistoryRow, 'id' | 'trace_no' | 'lot_no' | 'quantity' | 'used_quantity'>
}

/** 出荷リスト：使用数編集モーダル */
export default function UsedQuantityEditModal({ open, onOpenChange, log }: Props) {
  const [value, setValue] = useState(log.used_quantity)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setValue(log.used_quantity)
      setError('')
    }
  }, [open, log.id, log.used_quantity])

  const handleSave = () => {
    setError('')
    if (Number.isNaN(value) || !Number.isInteger(value) || value < 0) {
      setError('使用数は0以上の整数で指定してください。')
      return
    }
    if (value > log.quantity) {
      setError(`使用数は出荷数量（${log.quantity}）以下にしてください。`)
      return
    }

    startTransition(async () => {
      const response = await updateDeliveryUsedQuantity(log.id, value)
      if (!response.success) {
        setError('error' in response ? response.error : '更新に失敗しました。')
        return
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-lg">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-neutral-800">使用数を編集</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            出荷履歴の使用数を変更します
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">ロット番号</p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-sm text-gray-900">
              {log.lot_no}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">TraceNo</p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-sm text-gray-900">
              {log.trace_no || '-'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">出荷数量</p>
            <p className="text-sm text-gray-900">{log.quantity}個</p>
          </div>
          <div>
            <label htmlFor="used-quantity-input" className="mb-1 block text-xs font-medium text-gray-700">
              使用数
            </label>
            <input
              id="used-quantity-input"
              type="number"
              min={0}
              max={log.quantity}
              step={1}
              value={value}
              disabled={isPending}
              onChange={e => setValue(Number.parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="mt-1 text-[11px] text-gray-500">0 〜 {log.quantity} の整数</p>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
