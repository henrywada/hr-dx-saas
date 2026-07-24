'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { updateTraceProcessStatus } from '@/features/myou/actions'
import {
  processStatusLabel,
  PROCESS_STATUS_EDIT_VALUES,
  type ProcessStatus,
} from '@/features/myou/lib/process-status'
import type { ExpiringTraceLabel } from '@/features/myou/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: Pick<ExpiringTraceLabel, 'id' | 'trace_no' | 'process_status'>
}

export default function ProcessStatusEditModal({ open, onOpenChange, label }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<ProcessStatus>(label.process_status)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      // 「使用済」は選択肢から除外したため、既存値が used の場合は未使用に戻す
      setSelectedStatus(label.process_status === 'used' ? 'unused' : label.process_status)
      setError('')
    }
  }, [open, label.id, label.process_status])

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const response = await updateTraceProcessStatus(label.id, selectedStatus)
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
          <DialogTitle className="text-lg font-bold text-neutral-800">
            処理ステータスを編集
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            TraceNo {label.trace_no} の処理ステータスを変更します
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">TraceNo</label>
            <p className="font-mono text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              {label.trace_no}
            </p>
          </div>

          <div>
            <label
              htmlFor="process-status-select"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              処理ステータス
            </label>
            <select
              id="process-status-select"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as ProcessStatus)}
              disabled={isPending}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {PROCESS_STATUS_EDIT_VALUES.map(value => (
                <option key={value} value={value}>
                  {processStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                保存中...
              </>
            ) : (
              '保存する'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
