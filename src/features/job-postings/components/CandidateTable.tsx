'use client'

import { useEffect, useState, useTransition } from 'react'
import { STAGE_LABELS, ACTIVE_STAGES, type Candidate, type CandidateStage } from '../types'
import { fetchCandidatesByStage, updateCandidateStage } from '../actions'

interface Props {
  stage: CandidateStage
  onClose: () => void
}

/** 最終アクションからの経過日数 */
function calcElapsedDays(lastActionAt: string): number {
  return Math.floor((Date.now() - new Date(lastActionAt).getTime()) / (1000 * 60 * 60 * 24))
}

export function CandidateTable({ stage, onClose }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // ステージが変わるたびに候補者を再取得
  // setLoading は非同期コールバック内からのみ呼ぶことで同期 setState を回避
  useEffect(() => {
    let cancelled = false
    fetchCandidatesByStage(stage)
      .then(data => {
        if (!cancelled) {
          setCandidates(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [stage])

  function handleStageChange(candidateId: string, nextStage: CandidateStage) {
    startTransition(async () => {
      await updateCandidateStage(candidateId, nextStage)
      // 楽観的更新：ローカルリストから即座に除外
      setCandidates(prev => prev.filter(c => c.id !== candidateId))
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-white shadow-sm ring-1 ring-primary/10">
      {/* ヘッダー */}
      <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            {STAGE_LABELS[stage]}
            <span className="ml-2 text-sm font-normal text-gray-500">
              {loading ? '読込中' : `${candidates.length}件`}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ステージを変更するとリストから自動で移動します
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* テーブル本体 */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">読み込み中...</div>
        ) : candidates.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {STAGE_LABELS[stage]}の候補者はいません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  氏名
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  求人
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  担当者
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  最終アクション
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  次のステージへ
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, idx) => {
                const elapsed = calcElapsedDays(candidate.last_action_at)
                const isStale = elapsed >= 7
                const currentIdx = ACTIVE_STAGES.indexOf(stage)
                const nextStage =
                  currentIdx >= 0 && currentIdx < ACTIVE_STAGES.length - 1
                    ? ACTIVE_STAGES[currentIdx + 1]
                    : null

                return (
                  <tr
                    key={candidate.id}
                    className={[
                      'border-b border-gray-100',
                      'transition-[background-color,box-shadow] duration-300 ease-out',
                      'hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{candidate.name}</span>
                      {candidate.email && (
                        <p className="text-xs text-gray-400 mt-0.5">{candidate.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-40">
                      <span className="truncate block">{candidate.job_posting?.title ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {candidate.assignee?.name ?? <span className="text-gray-300">未設定</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          'text-xs font-medium',
                          isStale ? 'text-red-600' : 'text-gray-500',
                        ].join(' ')}
                      >
                        {elapsed === 0 ? '今日' : `${elapsed}日前`}
                        {isStale && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nextStage ? (
                        <button
                          onClick={() => handleStageChange(candidate.id, nextStage)}
                          disabled={isPending}
                          className="text-xs text-primary hover:underline disabled:opacity-50 whitespace-nowrap"
                        >
                          {STAGE_LABELS[nextStage]}へ →
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
