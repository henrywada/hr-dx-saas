'use client'

import { useState } from 'react'
import { JobPostingAiVariant, MEDIA_LABELS } from '../types'
import { applyVariantToJobPosting } from '../actions'

interface MediaVariantCardProps {
  variant: JobPostingAiVariant
  onApplied?: () => void
}

export function MediaVariantCard({ variant, onApplied }: MediaVariantCardProps) {
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${variant.title}\n\n${variant.description}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = async () => {
    if (!variant.job_posting_id) return
    setApplying(true)
    try {
      await applyVariantToJobPosting(variant.id)
      onApplied?.()
    } finally {
      setApplying(false)
    }
  }

  const mediaLabel = MEDIA_LABELS[variant.media_type] ?? variant.media_type

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {mediaLabel}
        </span>
        {variant.is_applied && (
          <span className="text-xs text-green-600 font-medium">✓ 適用済み</span>
        )}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-gray-900 leading-snug">{variant.title}</h3>

      <p className="mb-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-6">
        {variant.description}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? 'コピー済み' : 'コピー'}
        </button>
        {variant.job_posting_id && !variant.is_applied && (
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {applying ? '適用中...' : '求人票に適用'}
          </button>
        )}
      </div>
    </div>
  )
}
