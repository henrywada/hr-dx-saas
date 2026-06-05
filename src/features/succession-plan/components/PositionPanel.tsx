'use client'

import { useState, useTransition } from 'react'
import { deactivatePosition, deleteCandidate } from '../actions'
import { PositionFormModal } from './PositionFormModal'
import { CandidateFormModal } from './CandidateFormModal'
import type {
  PositionWithCandidates,
  CandidateRow,
  EmployeeOption,
  DivisionOption,
} from '../types'
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, READINESS_LABELS, READINESS_COLORS } from '../types'

interface Props {
  positions: PositionWithCandidates[]
  employees: EmployeeOption[]
  divisions: DivisionOption[]
  onAddPosition: () => void
}

export function PositionPanel({ positions, employees, divisions, onAddPosition }: Props) {
  const [, startTransition] = useTransition()
  const [editingPosition, setEditingPosition] = useState<PositionWithCandidates | null>(null)
  const [addingCandidateTo, setAddingCandidateTo] = useState<PositionWithCandidates | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<{
    position: PositionWithCandidates
    candidate: CandidateRow
  } | null>(null)

  function handleDeactivate(positionId: string) {
    if (!confirm('このポジションを非表示にしますか？')) return
    startTransition(async () => {
      await deactivatePosition(positionId)
    })
  }

  function handleDeleteCandidate(candidateId: string) {
    if (!confirm('この候補者登録を削除しますか？')) return
    startTransition(async () => {
      await deleteCandidate(candidateId)
    })
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-500">重要ポジションがまだ登録されていません。</p>
        <button
          onClick={onAddPosition}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + ポジションを追加
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {positions.map(position => (
          <div
            key={position.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            {/* ポジションヘッダー */}
            <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{position.title}</h3>
                {position.division_name && (
                  <span className="text-xs text-gray-500">{position.division_name}</span>
                )}
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLORS[position.risk_level]}`}
                >
                  {RISK_LEVEL_LABELS[position.risk_level]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {position.current_holder_name && (
                  <span className="text-xs text-gray-500">
                    現任: {position.current_holder_name}
                  </span>
                )}
                <button
                  onClick={() => setEditingPosition(position)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeactivate(position.id)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  非表示
                </button>
              </div>
            </div>

            {/* 候補者一覧 */}
            <div className="p-4">
              {position.candidates.length === 0 ? (
                <p className="text-sm text-gray-400">候補者が未登録です</p>
              ) : (
                <div className="mb-3 overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500">
                        <th className="px-4 py-2 font-medium">候補者</th>
                        <th className="px-4 py-2 font-medium">部署</th>
                        <th className="px-4 py-2 font-medium">準備度</th>
                        <th className="px-4 py-2 text-center font-medium">パフォーマンス</th>
                        <th className="px-4 py-2 text-center font-medium">ポテンシャル</th>
                        <th className="px-4 py-2 font-medium">育成アクション</th>
                        <th className="px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {position.candidates.map(c => (
                        <tr key={c.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {c.employee_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.department_name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${READINESS_COLORS[c.readiness]}`}
                            >
                              {READINESS_LABELS[c.readiness]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {'●'.repeat(c.performance_score)}
                            {'○'.repeat(3 - c.performance_score)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {'●'.repeat(c.potential_score)}
                            {'○'.repeat(3 - c.potential_score)}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-xs text-gray-600">
                            {c.development_actions ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setEditingCandidate({ position, candidate: c })
                                }
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDeleteCandidate(c.id)}
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setAddingCandidateTo(position)}
                className="rounded-lg border border-dashed border-blue-300 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50"
              >
                + 候補者を追加
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingPosition && (
        <PositionFormModal
          position={editingPosition}
          employees={employees}
          divisions={divisions}
          onClose={() => setEditingPosition(null)}
        />
      )}

      {addingCandidateTo && (
        <CandidateFormModal
          position={addingCandidateTo}
          employees={employees}
          onClose={() => setAddingCandidateTo(null)}
        />
      )}

      {editingCandidate && (
        <CandidateFormModal
          position={editingCandidate.position}
          candidate={editingCandidate.candidate}
          employees={employees}
          onClose={() => setEditingCandidate(null)}
        />
      )}
    </>
  )
}
