'use client'

import { useState } from 'react'
import { TenantBrandingInfo } from '../types'
import { updateTenantBrandingInfo } from '../actions'

interface BrandingStep1Props {
  initial: TenantBrandingInfo
  onNext: (info: TenantBrandingInfo) => void
}

export function BrandingStep1CompanyInfo({ initial, onNext }: BrandingStep1Props) {
  const [industry, setIndustry] = useState(initial.industry ?? '')
  const [foundingYear, setFoundingYear] = useState<string>(
    initial.founding_year ? String(initial.founding_year) : ''
  )
  const [strengths, setStrengths] = useState(initial.recruitment_strengths ?? '')
  const [saving, setSaving] = useState(false)

  const handleNext = async () => {
    setSaving(true)
    try {
      const info: TenantBrandingInfo = {
        industry: industry.trim() || null,
        founding_year: foundingYear ? parseInt(foundingYear, 10) : null,
        recruitment_strengths: strengths.trim() || null,
      }
      await updateTenantBrandingInfo(info)
      onNext(info)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Step 1: 会社情報の確認・入力</h2>
        <p className="mt-1 text-sm text-gray-500">
          AIがより的確な差別化ポイントを生成するために、会社のブランディング情報を入力してください。
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">業界</label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="例: IT・SaaS、製造業、小売業"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">設立年</label>
          <input
            type="number"
            value={foundingYear}
            onChange={e => setFoundingYear(e.target.value)}
            placeholder="例: 2010"
            min={1800}
            max={new Date().getFullYear()}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            採用の強み・アピールポイント
          </label>
          <textarea
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            rows={4}
            placeholder="例: フルリモート可、育休取得率100%、年間20日の有給休暇、技術研修制度充実"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? '保存中...' : '次へ →'}
        </button>
      </div>
    </div>
  )
}
