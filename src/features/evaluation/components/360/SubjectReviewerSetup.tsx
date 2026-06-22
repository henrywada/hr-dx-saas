'use client'

import { useState, useTransition } from 'react'
import { addSubject, removeSubject, addReviewer, removeReviewer } from '@/features/evaluation/360-actions'
import type { SubjectWithReviewers, ReviewerType } from '@/features/evaluation/360-types'
import { REVIEWER_TYPE_LABELS } from '@/features/evaluation/360-types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  campaignId: string
  subjects: SubjectWithReviewers[]
  employees: Employee[]
  disabled?: boolean
}

const REVIEWER_TYPES: ReviewerType[] = ['superior', 'peer', 'subordinate', 'self']

export function SubjectReviewerSetup({ campaignId, subjects, employees, disabled }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [addSubjectEmpId, setAddSubjectEmpId] = useState('')
  const [addReviewerForm, setAddReviewerForm] = useState<{
    empId: string
    type: ReviewerType
    isAnon: boolean
  }>({ empId: '', type: 'peer', isAnon: false })
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const existingSubjectEmpIds = new Set(subjects.map(s => s.employee_id))
  const existingReviewerEmpIds = new Set(
    selectedSubject?.reviewers.map(r => r.reviewer_employee_id) ?? []
  )

  function handleAddSubject() {
    if (!addSubjectEmpId) { setError('対象者を選択してください'); return }
    setError('')
    startTransition(async () => {
      const result = await addSubject(campaignId, addSubjectEmpId)
      if (result.success === false) { setError(result.error); return }
      setAddSubjectEmpId('')
    })
  }

  function handleRemoveSubject(subjectId: string) {
    if (!confirm('被評価者を削除すると、関連する評価者・回答もすべて削除されます。よろしいですか？')) return
    startTransition(async () => {
      const result = await removeSubject(subjectId)
      if (result.success === false) setError(result.error)
      else if (selectedSubjectId === subjectId) setSelectedSubjectId(null)
    })
  }

  function handleAddReviewer() {
    if (!selectedSubjectId) return
    if (!addReviewerForm.empId) { setError('評価者を選択してください'); return }
    setError('')
    startTransition(async () => {
      const result = await addReviewer(selectedSubjectId, {
        reviewer_employee_id: addReviewerForm.empId,
        reviewer_type: addReviewerForm.type,
        is_anonymous: addReviewerForm.isAnon,
      })
      if (result.success === false) { setError(result.error); return }
      setAddReviewerForm({ empId: '', type: 'peer', isAnon: false })
    })
  }

  function handleRemoveReviewer(reviewerId: string) {
    startTransition(async () => {
      const result = await removeReviewer(reviewerId)
      if (result.success === false) setError(result.error)
    })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 左：被評価者リスト */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#24292f]">被評価者</h3>

        {!disabled && (
          <div className="flex gap-2">
            <select
              value={addSubjectEmpId}
              onChange={e => setAddSubjectEmpId(e.target.value)}
              className="flex-1 border border-[#e2e6ec] rounded px-2 py-1 text-sm focus:outline-none"
            >
              <option value="">従業員を選択</option>
              {employees
                .filter(e => !existingSubjectEmpIds.has(e.id))
                .map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}{e.department_name ? ` (${e.department_name})` : ''}
                  </option>
                ))}
            </select>
            <button
              onClick={handleAddSubject}
              disabled={isPending}
              className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        )}

        <div className="space-y-1">
          {subjects.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border ${
                selectedSubjectId === s.id
                  ? 'border-primary bg-primary/5'
                  : 'border-[#e2e6ec] hover:bg-[#f6f8fa]'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-[#24292f]">{s.employee_name}</p>
                <p className="text-xs text-[#57606a]">
                  {s.department_name} · 評価者 {s.total_count}名 ({s.responded_count}名回答済)
                </p>
              </div>
              {!disabled && (
                <button
                  onClick={e => { e.stopPropagation(); handleRemoveSubject(s.id) }}
                  className="text-xs text-[#57606a] hover:text-red-500"
                >
                  削除
                </button>
              )}
            </div>
          ))}
          {subjects.length === 0 && (
            <p className="text-sm text-[#57606a] py-4 text-center">被評価者がいません</p>
          )}
        </div>
      </div>

      {/* 右：評価者リスト */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#24292f]">
          {selectedSubject ? `${selectedSubject.employee_name} の評価者` : '評価者'}
        </h3>

        {!selectedSubject && (
          <p className="text-sm text-[#57606a] py-4 text-center">左の被評価者を選択してください</p>
        )}

        {selectedSubject && (
          <>
            {!disabled && (
              <div className="space-y-2 border border-[#e2e6ec] rounded-lg p-3">
                <select
                  value={addReviewerForm.empId}
                  onChange={e =>
                    setAddReviewerForm(prev => ({ ...prev, empId: e.target.value }))
                  }
                  className="w-full border border-[#e2e6ec] rounded px-2 py-1 text-sm focus:outline-none"
                >
                  <option value="">評価者を選択</option>
                  {employees
                    .filter(e => !existingReviewerEmpIds.has(e.id))
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
                <div className="flex gap-2 items-center">
                  <select
                    value={addReviewerForm.type}
                    onChange={e =>
                      setAddReviewerForm(prev => ({
                        ...prev,
                        type: e.target.value as ReviewerType,
                      }))
                    }
                    className="border border-[#e2e6ec] rounded px-2 py-1 text-sm focus:outline-none"
                  >
                    {REVIEWER_TYPES.map(t => (
                      <option key={t} value={t}>{REVIEWER_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[#57606a]">
                    <input
                      type="checkbox"
                      checked={addReviewerForm.isAnon}
                      onChange={e =>
                        setAddReviewerForm(prev => ({ ...prev, isAnon: e.target.checked }))
                      }
                      className="accent-primary"
                    />
                    匿名
                  </label>
                  <button
                    onClick={handleAddReviewer}
                    disabled={isPending}
                    className="ml-auto px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {selectedSubject.reviewers.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 border border-[#e2e6ec] rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium text-[#24292f]">{r.reviewer_name}</span>
                    <span className="ml-2 text-xs text-[#57606a]">
                      {REVIEWER_TYPE_LABELS[r.reviewer_type]}
                      {r.is_anonymous && ' · 匿名'}
                    </span>
                    {r.submitted_at && (
                      <span className="ml-2 text-xs text-green-600">回答済</span>
                    )}
                  </div>
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveReviewer(r.id)}
                      disabled={isPending}
                      className="text-xs text-[#57606a] hover:text-red-500"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              {selectedSubject.reviewers.length === 0 && (
                <p className="text-sm text-[#57606a] py-4 text-center">評価者がいません</p>
              )}
            </div>
          </>
        )}
      </div>

      {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
    </div>
  )
}
