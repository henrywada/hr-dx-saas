'use client'

import { useState } from 'react'
import { JobPosting, MediaType, MEDIA_LABELS } from '../types'

const ALL_MEDIA: MediaType[] = ['indeed', 'linkedin', 'hellowork', 'company_site']

interface BrandingStep2Props {
  jobPostings: JobPosting[]
  onNext: (jobPosting: JobPosting, targetMedia: MediaType[]) => void
  onBack: () => void
}

export function BrandingStep2JobInfo({ jobPostings, onNext, onBack }: BrandingStep2Props) {
  const [selectedId, setSelectedId] = useState<string>(jobPostings[0]?.id ?? '')
  const [targetMedia, setTargetMedia] = useState<MediaType[]>(['indeed', 'linkedin'])

  const selectedJob = jobPostings.find(j => j.id === selectedId)

  const toggleMedia = (media: MediaType) => {
    setTargetMedia(prev =>
      prev.includes(media) ? prev.filter(m => m !== media) : [...prev, media]
    )
  }

  const handleNext = () => {
    if (!selectedJob) return
    if (targetMedia.length === 0) return
    onNext(selectedJob, targetMedia)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Step 2: 求人票と対象媒体の選択</h2>
        <p className="mt-1 text-sm text-gray-500">
          ブランディング強化したい求人票と、出稿予定の媒体を選んでください。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">求人票を選択</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {jobPostings.map(job => (
            <option key={job.id} value={job.id}>
              {job.title ?? '（タイトルなし）'} — {job.status}
            </option>
          ))}
        </select>
        {selectedJob?.description && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-3 whitespace-pre-wrap">
            {selectedJob.description.replace(/<[^>]+>/g, '')}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          対象媒体（複数選択可）
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_MEDIA.map(media => {
            const checked = targetMedia.includes(media)
            return (
              <button
                key={media}
                type="button"
                onClick={() => toggleMedia(media)}
                className={[
                  'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                  checked
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {MEDIA_LABELS[media]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← 戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedJob || targetMedia.length === 0}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          次へ →
        </button>
      </div>
    </div>
  )
}
