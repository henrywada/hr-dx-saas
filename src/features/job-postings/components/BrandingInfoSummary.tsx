'use client'

import { TenantBrandingInfo } from '../types'

interface BrandingInfoSummaryProps {
  info: TenantBrandingInfo
  onEdit?: () => void
}

export function BrandingInfoSummary({ info, onEdit }: BrandingInfoSummaryProps) {
  const hasData = info.industry || info.founding_year || info.recruitment_strengths

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">会社ブランディング情報</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">
            編集
          </button>
        )}
      </div>
      {hasData ? (
        <dl className="space-y-1 text-xs text-gray-700">
          {info.industry && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gray-500">業界</dt>
              <dd>{info.industry}</dd>
            </div>
          )}
          {info.founding_year && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gray-500">設立</dt>
              <dd>{info.founding_year}年</dd>
            </div>
          )}
          {info.recruitment_strengths && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gray-500">採用強み</dt>
              <dd className="whitespace-pre-wrap">{info.recruitment_strengths}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-xs text-gray-400">未設定（Step 1 で入力してください）</p>
      )}
    </div>
  )
}
