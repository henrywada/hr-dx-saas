'use client'

import { useState } from 'react'
import { STAGE_LABELS, type Candidate } from '../types'
import { updateCandidateStage } from '../actions'

interface Props {
  candidates: Candidate[]
  thresholdDays: number
}

/** 候補者の最終アクションからの経過日数を計算する */
function calcElapsedDays(lastActionAt: string): number {
  const diff = Date.now() - new Date(lastActionAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const STAGE_ORDER = [
  'applied',
  'screening',
  'interview_1',
  'interview_2',
  'final',
  'offered',
  'hired',
] as const

export function StaleAlert({ candidates, thresholdDays }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const visible = candidates.filter(c => !dismissedIds.has(c.id))

  async function handleAdvanceStage(candidate: Candidate) {
    setLoadingId(candidate.id)
    try {
      const currentIdx = STAGE_ORDER.indexOf(candidate.stage as (typeof STAGE_ORDER)[number])
      const nextStage =
        currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null
      if (nextStage) {
        await updateCandidateStage(candidate.id, nextStage)
        // ステージ更新後は放置リストから除外（画面リフレッシュまで）
        setDismissedIds(prev => new Set([...prev, candidate.id]))
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gray-200 border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
            {visible.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {visible.length}
              </span>
            )}
            放置候補者
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{thresholdDays}日以上アクションなし</p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">放置候補者はいません</div>
        ) : (
          visible.map(candidate => {
            const elapsed = calcElapsedDays(candidate.last_action_at)
            const isLoading = loadingId === candidate.id

            return (
              <div
                key={candidate.id}
                className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{candidate.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 whitespace-nowrap">
                      {STAGE_LABELS[candidate.stage]}
                    </span>
                    {candidate.job_posting?.title && (
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">
                        {candidate.job_posting.title}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-red-700 font-medium">
                    {elapsed}日間 アクションなし
                  </p>
                  {candidate.assignee && (
                    <p className="mt-0.5 text-xs text-gray-500">担当: {candidate.assignee.name}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 items-end">
                  {/* 候補者へのメール催促 */}
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}?subject=${encodeURIComponent(`【採用選考】${candidate.name}様 ご連絡`)}`}
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                      target="_blank"
                      rel="noreferrer"
                    >
                      催促メール
                    </a>
                  )}
                  {/* 次ステージへ進める */}
                  <button
                    onClick={() => handleAdvanceStage(candidate)}
                    disabled={isLoading}
                    className="text-xs text-gray-600 hover:text-primary hover:underline disabled:opacity-50 whitespace-nowrap"
                  >
                    {isLoading ? '更新中...' : '次へ進む'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
