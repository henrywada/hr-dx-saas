'use client'

import type { HrUpdateDocument } from '../types'

type Props = {
  document: HrUpdateDocument | null
  onClose: () => void
}

/** 「詳細をみる」モーダル — 詳細説明を主、URLは参照用 */
export function SourceUrlModal({ document, onClose }: Props) {
  if (!document) return null

  const detailText = (document.detail && document.detail.trim()) || document.summary

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-url-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg border border-[#e2e6ec] bg-white shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 shrink-0 border-b border-[#e2e6ec]">
          <h2 id="source-url-modal-title" className="text-sm font-semibold text-[#24292f]">
            詳細情報
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

        <div className="px-5 py-4 overflow-y-auto space-y-3 flex-1 min-h-0">
          <p className="text-sm font-medium text-[#24292f] leading-snug">{document.title}</p>
          <p className="text-xs text-[#57606a]">
            取得日: {document.fetched_at.slice(0, 10)}
            {document.published_at ? ` ／ 公開日: ${document.published_at}` : ''}
            {document.theme ? ` ／ テーマ: ${document.theme}` : ''}
          </p>

          <div className="rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-3">
            <p className="text-[11px] font-semibold text-[#57606a] mb-1.5">詳細説明</p>
            <p className="text-xs text-[#24292f] leading-relaxed whitespace-pre-wrap">
              {detailText}
            </p>
          </div>

          <div className="pt-1">
            <p className="text-[11px] font-semibold text-[#57606a] mb-1">情報元URL</p>
            <a
              href={document.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-[#FD7601] break-all hover:underline"
            >
              {document.source_url}
            </a>
            <p className="text-[11px] text-[#8b949e] mt-1">
              上記の詳細説明で足りない場合のみ、公式ページを確認してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
