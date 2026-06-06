'use client'

import { JobPostingAiVariant, DifferentiationPoints } from '../types'
import { DifferentiationPanel } from './DifferentiationPanel'
import { MediaVariantCard } from './MediaVariantCard'

interface BrandingStep4Props {
  variants: JobPostingAiVariant[]
  diffPoints: DifferentiationPoints
  onRestart: () => void
}

export function BrandingStep4Review({ variants, diffPoints, onRestart }: BrandingStep4Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Step 4: 生成結果の確認・適用</h2>
        <p className="mt-1 text-sm text-gray-500">
          媒体別に最適化された求人票を確認し、コピーまたは求人票に直接適用してください。
        </p>
      </div>

      <DifferentiationPanel points={diffPoints.points} summary={diffPoints.summary} />

      {variants.length === 0 ? (
        <p className="text-sm text-gray-500">バリアントの生成に失敗しました。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {variants.map(variant => (
            <MediaVariantCard key={variant.id} variant={variant} />
          ))}
        </div>
      )}

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          最初からやり直す
        </button>
      </div>
    </div>
  )
}
