'use client'

import { useReducer } from 'react'
import {
  JobPosting,
  TenantBrandingInfo,
  BrandingPromptInput,
  JobPostingAiVariant,
  DifferentiationPoints,
  MediaType,
} from '../types'
import { BrandingStep1CompanyInfo } from './BrandingStep1CompanyInfo'
import { BrandingStep2JobInfo } from './BrandingStep2JobInfo'
import { BrandingStep3Generate } from './BrandingStep3Generate'
import { BrandingStep4Review } from './BrandingStep4Review'

// ── ウィザード状態 ──────────────────────────────────────────────────────────

interface WizardState {
  step: 1 | 2 | 3 | 4
  brandingInfo: TenantBrandingInfo
  selectedJob: JobPosting | null
  targetMedia: MediaType[]
  variants: JobPostingAiVariant[]
  diffPoints: DifferentiationPoints | null
}

type WizardAction =
  | { type: 'STEP1_DONE'; payload: TenantBrandingInfo }
  | { type: 'STEP2_DONE'; payload: { job: JobPosting; media: MediaType[] } }
  | {
      type: 'STEP3_DONE'
      payload: { variants: JobPostingAiVariant[]; diffPoints: DifferentiationPoints }
    }
  | { type: 'BACK' }
  | { type: 'RESTART' }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'STEP1_DONE':
      return { ...state, step: 2, brandingInfo: action.payload }
    case 'STEP2_DONE':
      return {
        ...state,
        step: 3,
        selectedJob: action.payload.job,
        targetMedia: action.payload.media,
      }
    case 'STEP3_DONE':
      return {
        ...state,
        step: 4,
        variants: action.payload.variants,
        diffPoints: action.payload.diffPoints,
      }
    case 'BACK':
      return { ...state, step: Math.max(1, state.step - 1) as WizardState['step'] }
    case 'RESTART':
      return { ...state, step: 1, variants: [], diffPoints: null, selectedJob: null }
    default:
      return state
  }
}

// ── コンポーネント ──────────────────────────────────────────────────────────

interface BrandingWizardProps {
  jobPostings: JobPosting[]
  initialBrandingInfo: TenantBrandingInfo
  companyName: string
}

const STEPS = ['会社情報', '求人票選択', 'AI生成', '結果確認']

export function BrandingWizard({
  jobPostings,
  initialBrandingInfo,
  companyName,
}: BrandingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    step: 1,
    brandingInfo: initialBrandingInfo,
    selectedJob: null,
    targetMedia: [],
    variants: [],
    diffPoints: null,
  })

  const promptInput: BrandingPromptInput | null = state.selectedJob
    ? {
        jobTitle: state.selectedJob.title ?? '',
        jobDescription: state.selectedJob.description?.replace(/<[^>]+>/g, '') ?? '',
        companyName,
        industry: state.brandingInfo.industry,
        foundingYear: state.brandingInfo.founding_year,
        recruitmentStrengths: state.brandingInfo.recruitment_strengths,
        targetMedia: state.targetMedia,
      }
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ステッパーヘッダー */}
      <div className="flex border-b border-gray-200">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === state.step
          const isDone = stepNum < state.step
          return (
            <div
              key={stepNum}
              className={[
                'flex-1 py-3 text-center text-xs font-medium transition-colors',
                isActive ? 'border-b-2 border-primary text-primary' : 'text-gray-400',
              ].join(' ')}
            >
              <span
                className={[
                  'mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                  isDone
                    ? 'bg-accent-teal text-white'
                    : isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {isDone ? '✓' : stepNum}
              </span>
              {label}
            </div>
          )
        })}
      </div>

      {/* ステップコンテンツ */}
      <div className="p-6">
        {state.step === 1 && (
          <BrandingStep1CompanyInfo
            initial={state.brandingInfo}
            onNext={info => dispatch({ type: 'STEP1_DONE', payload: info })}
          />
        )}
        {state.step === 2 && (
          <BrandingStep2JobInfo
            jobPostings={jobPostings}
            onNext={(job, media) => dispatch({ type: 'STEP2_DONE', payload: { job, media } })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {state.step === 3 && promptInput && (
          <BrandingStep3Generate
            promptInput={promptInput}
            jobPostingId={state.selectedJob?.id}
            onNext={(variants, diffPoints) =>
              dispatch({ type: 'STEP3_DONE', payload: { variants, diffPoints } })
            }
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {state.step === 4 && state.diffPoints && (
          <BrandingStep4Review
            variants={state.variants}
            diffPoints={state.diffPoints}
            onRestart={() => dispatch({ type: 'RESTART' })}
          />
        )}
      </div>
    </div>
  )
}
