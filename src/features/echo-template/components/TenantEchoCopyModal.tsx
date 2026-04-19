'use client'

import { useState, useTransition } from 'react'
import { Copy, FileText } from 'lucide-react'
import { copyEchoTemplate } from '../actions'
import type { EchoTemplate } from '../types'

interface Props {
  templates: EchoTemplate[]
  onCopied: () => void
  onClose: () => void
}

export default function TenantEchoCopyModal({ templates, onCopied, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCopy() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await copyEchoTemplate(selectedId)
      if (!result.success) {
        setError(result.error ?? 'コピーに失敗しました')
        return
      }
      onCopied()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[min(90vh,900px)] flex flex-col p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1 shrink-0">テンプレートからコピー</h2>
        <p className="text-sm text-slate-500 mb-4 shrink-0">
          使用するテンプレートを選択してください。コピー後に設問をカスタマイズできます。
        </p>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">利用できるテンプレートがありません。</p>
          </div>
        ) : (
          <div className="space-y-2 min-h-0 flex-1 overflow-y-auto mb-4">
            {templates.map(t => (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === t.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={selectedId === t.id}
                  onChange={() => setSelectedId(t.id)}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{t.question_count} 問</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-3 shrink-0">{error}</p>}

        <div className="flex justify-end gap-2 shrink-0 mt-auto pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleCopy}
            disabled={!selectedId || isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <Copy size={14} />
            {isPending ? 'コピー中...' : 'このテンプレートをコピー'}
          </button>
        </div>
      </div>
    </div>
  )
}
