'use client'

import { useState } from 'react'
import { deleteKeyResult } from '../actions'
import { CheckinFormModal } from './CheckinFormModal'
import { KeyResultFormModal } from './KeyResultFormModal'
import { CheckinHistoryList } from './CheckinHistoryList'
import { KEY_RESULT_STATUS_LABELS, KEY_RESULT_STATUS_COLORS, CONFIDENCE_LABELS } from '../types'
import type { KeyResultWithCheckins } from '../types'

interface Props {
  keyResults: KeyResultWithCheckins[]
  objectiveId: string
  isAdmin: boolean
}

function progressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

export function KeyResultList({ keyResults, objectiveId, isAdmin }: Props) {
  const [checkinTarget, setCheckinTarget] = useState<KeyResultWithCheckins | null>(null)
  const [editTarget, setEditTarget] = useState<KeyResultWithCheckins | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [expandedKrId, setExpandedKrId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete(krId: string) {
    setDeleteLoading(true)
    await deleteKeyResult(krId)
    setDeleteId(null)
    setDeleteLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">Key Results</h2>
        {isAdmin && (
          <button
            onClick={() => setAddOpen(true)}
            className="text-xs rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-primary/90 transition-colors"
          >
            + KR を追加
          </button>
        )}
      </div>

      {keyResults.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          Key Result がまだありません。「+ KR を追加」から追加してください。
        </p>
      ) : (
        <div className="space-y-3">
          {keyResults.map(kr => {
            const statusClass = KEY_RESULT_STATUS_COLORS[kr.status] ?? 'text-gray-600 bg-gray-50'
            const isExpanded = expandedKrId === kr.id

            return (
              <div key={kr.id} className="rounded-xl border border-gray-200 bg-white">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>
                          {KEY_RESULT_STATUS_LABELS[kr.status]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {kr.kr_type === 'quantitative' ? '定量' : '定性'}
                        </span>
                        {kr.due_date && (
                          <span className="text-xs text-gray-400">期限: {kr.due_date}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{kr.title}</p>

                      {kr.kr_type === 'quantitative' && kr.target_value != null && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {kr.current_value ?? 0}
                          {kr.unit ?? ''} / {kr.target_value}
                          {kr.unit ?? ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {kr.latest_checkin && (
                        <span className="text-xs text-gray-500">
                          {CONFIDENCE_LABELS[kr.latest_checkin.confidence]}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900">{kr.progress}%</span>
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${progressBarColor(kr.progress)}`}
                      style={{ width: `${Math.min(100, kr.progress)}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {kr.status !== 'cancelled' && kr.status !== 'completed' && (
                      <button
                        onClick={() => setCheckinTarget(kr)}
                        className="text-xs rounded-lg bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 px-3 py-1.5 transition-colors"
                      >
                        チェックインを記録
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedKrId(isExpanded ? null : kr.id)}
                      className="text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-1.5 transition-colors"
                    >
                      {isExpanded ? '履歴を閉じる' : `履歴 (${kr.checkin_count}件)`}
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setEditTarget(kr)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteId(kr.id)}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 transition-colors"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <CheckinHistoryList checkins={kr.checkins} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">KRを削除しますか？</h3>
            <p className="text-sm text-gray-500 mb-5">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkinTarget && (
        <CheckinFormModal
          open={true}
          onClose={() => setCheckinTarget(null)}
          keyResultId={checkinTarget.id}
          keyResultTitle={checkinTarget.title}
          krType={checkinTarget.kr_type}
          targetValue={checkinTarget.target_value}
          unit={checkinTarget.unit}
        />
      )}

      <KeyResultFormModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        objectiveId={objectiveId}
        editTarget={editTarget}
      />

      <KeyResultFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        objectiveId={objectiveId}
      />
    </div>
  )
}
