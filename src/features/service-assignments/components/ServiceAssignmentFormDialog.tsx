'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { createServiceAssignment } from '../actions'

interface ServiceAssignmentFormDialogProps {
  open: boolean
  onClose: () => void
}

export function ServiceAssignmentFormDialog({
  open,
  onClose,
}: ServiceAssignmentFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState('')

  useEffect(() => {
    if (open) {
      setError(null)
      setServiceType('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = serviceType.trim()
    if (!trimmed) {
      setError('サービス種別を入力してください')
      return
    }

    startTransition(async () => {
      try {
        const result = await createServiceAssignment(trimmed)
        if (result.success) {
          onClose()
        } else {
          setError(result.error || '保存に失敗しました。')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '通信エラーが発生しました。')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">サービス割当を新規作成</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              サービス種別 (service_type) *
            </label>
            <input
              type="text"
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: pulse_survey, stress_check"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
