'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { applyForRequirement } from '../actions'

type Props = {
  requirementId: string
  onClose: () => void
}

export function ApplyRequirementModal({ requirementId, onClose }: Props) {
  const [evidence, setEvidence] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await applyForRequirement({
        requirementId,
        evidence: evidence.trim() || undefined,
      })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">要件達成申請</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              取得証明・コメント（任意）
            </label>
            <textarea
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              placeholder="例: 2026年3月に資格を取得しました（証明書番号: XXXX）"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '申請中...' : '申請する'}
          </button>
        </div>
      </div>
    </div>
  )
}
