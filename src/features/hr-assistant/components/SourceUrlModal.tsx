'use client'

import type { HrUpdateDocument } from '../types'

type Props = {
  document: HrUpdateDocument | null
  onClose: () => void
}

/** 「情報元を見る」モーダル */
export function SourceUrlModal({ document, onClose }: Props) {
  if (!document) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-url-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-[#e2e6ec] bg-white shadow-lg p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="source-url-modal-title" className="text-sm font-semibold text-[#24292f]">
            情報元
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#57606a] hover:text-[#24292f]"
            aria-label="閉じる"
          >
            閉じる
          </button>
        </div>
        <p className="text-sm font-medium text-[#24292f]">{document.title}</p>
        <p className="text-xs text-[#57606a]">
          取得日: {document.fetched_at.slice(0, 10)}
          {document.published_at ? ` ／ 公開日: ${document.published_at}` : ''}
        </p>
        <a
          href={document.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-[#FD7601] break-all hover:underline"
        >
          {document.source_url}
        </a>
        <p className="text-xs text-[#57606a] leading-relaxed whitespace-pre-wrap">
          {document.summary}
        </p>
      </div>
    </div>
  )
}
