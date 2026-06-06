'use client'

import { useState } from 'react'
import { BrandingPromptInput, DifferentiationPoints, JobPostingAiVariant } from '../types'
import { generateDifferentiationPoints, generateBrandedVariants } from '../actions'
import { DifferentiationPanel } from './DifferentiationPanel'
import { BrandingInfoSummary } from './BrandingInfoSummary'

interface BrandingStep3Props {
  promptInput: BrandingPromptInput
  jobPostingId?: string
  onNext: (variants: JobPostingAiVariant[], diffPoints: DifferentiationPoints) => void
  onBack: () => void
}

type GenPhase = 'idle' | 'diff' | 'variants' | 'done' | 'error'

export function BrandingStep3Generate({
  promptInput,
  jobPostingId,
  onNext,
  onBack,
}: BrandingStep3Props) {
  const [phase, setPhase] = useState<GenPhase>('idle')
  const [diffPoints, setDiffPoints] = useState<DifferentiationPoints | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerate = async () => {
    setPhase('diff')
    setErrorMsg('')
    try {
      const diff = await generateDifferentiationPoints(promptInput)
      setDiffPoints(diff)
      setPhase('variants')

      const result = await generateBrandedVariants(promptInput, diff.points, jobPostingId)
      setPhase('done')
      onNext(result.variants, diff)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'AI生成に失敗しました。')
      setPhase('error')
    }
  }

  const brandingInfo = {
    industry: promptInput.industry,
    founding_year: promptInput.foundingYear,
    recruitment_strengths: promptInput.recruitmentStrengths,
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Step 3: AI生成</h2>
        <p className="mt-1 text-sm text-gray-500">
          選択した求人票と会社情報をもとに、媒体別の求人票バリアントを生成します。
        </p>
      </div>

      <BrandingInfoSummary info={brandingInfo} />

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium">{promptInput.jobTitle}</p>
        <p className="mt-1 text-xs text-gray-500">対象媒体: {promptInput.targetMedia.join(', ')}</p>
      </div>

      {phase === 'diff' && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          差別化ポイントを分析中...
        </div>
      )}

      {phase === 'variants' && diffPoints && (
        <div className="space-y-3">
          <DifferentiationPanel points={diffPoints.points} summary={diffPoints.summary} />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            媒体別バリアントを生成中...
          </div>
        </div>
      )}

      {phase === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={phase === 'diff' || phase === 'variants'}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          ← 戻る
        </button>
        {(phase === 'idle' || phase === 'error') && (
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            生成開始
          </button>
        )}
      </div>
    </div>
  )
}
