'use client'

import { useState, useTransition } from 'react'
import {
  saveEvaluationScore,
  createEvaluationGoal,
  advanceEvaluationFlow,
} from '@/features/evaluation/actions'
import {
  AXIS_LABELS,
  FLOW_STATUS_LABELS,
  canEdit,
  type EvaluationSheet,
  type EvaluationTemplateWithItems,
  type EvaluationGoal,
  type EvaluationScore,
  type EvaluationAxis,
  type FlowStatus,
} from '@/features/evaluation/types'

interface Props {
  sheet: EvaluationSheet
  template: EvaluationTemplateWithItems
  goals: EvaluationGoal[]
  scores: EvaluationScore[]
  employeeId: string
}

const FLOW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  goal_set: 'bg-blue-50 text-blue-700',
  self_eval: 'bg-purple-50 text-purple-700',
  self_submitted: 'bg-purple-100 text-purple-800',
  primary_eval: 'bg-yellow-50 text-yellow-700',
  primary_submitted: 'bg-yellow-100 text-yellow-800',
  secondary_eval: 'bg-orange-50 text-orange-700',
  secondary_submitted: 'bg-orange-100 text-orange-800',
  confirming: 'bg-indigo-50 text-indigo-700',
  confirmed: 'bg-green-50 text-green-700',
}

const AXIS_BG: Record<EvaluationAxis, string> = {
  performance: 'bg-blue-50',
  ability: 'bg-purple-50',
  attitude: 'bg-green-50',
  mbo: 'bg-orange-50',
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5]
const AXES: EvaluationAxis[] = ['performance', 'ability', 'attitude', 'mbo']

export function MyEvaluationSheetClient({ sheet, template, goals, scores }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [localScores, setLocalScores] = useState<Map<string, { score?: number; comment?: string }>>(
    () => {
      const m = new Map<string, { score?: number; comment?: string }>()
      for (const s of scores) {
        if (s.evaluator_type === 'self') {
          const key = s.item_id ?? s.goal_id ?? ''
          m.set(key, { score: s.score ?? undefined, comment: s.comment ?? undefined })
        }
      }
      return m
    }
  )

  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDetail, setGoalDetail] = useState('')

  const isEditable = canEdit('self', sheet.flow_status)
  const hasMboItems = template.items.some(i => i.axis === 'mbo')

  function handleScoreChange(key: string, field: 'score' | 'comment', value: string | number) {
    setLocalScores(prev => {
      const next = new Map(prev)
      const current = next.get(key) ?? {}
      next.set(key, { ...current, [field]: value })
      return next
    })
  }

  function handleSaveScore(itemId: string) {
    const data = localScores.get(itemId)
    setError(null)
    startTransition(async () => {
      const result = await saveEvaluationScore({
        sheet_id: sheet.id,
        item_id: itemId,
        evaluator_type: 'self',
        score: data?.score,
        comment: data?.comment,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
      } else {
        setSuccess('保存しました')
        setTimeout(() => setSuccess(null), 2000)
      }
    })
  }

  function handleAddGoal() {
    if (!goalTitle.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createEvaluationGoal({
        sheet_id: sheet.id,
        goal_title: goalTitle,
        goal_detail: goalDetail || undefined,
        kpi_type: 'qualitative',
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setGoalTitle('')
      setGoalDetail('')
      setShowGoalForm(false)
    })
  }

  function handleAdvance(toStatus: FlowStatus) {
    const label = FLOW_STATUS_LABELS[toStatus]
    if (!confirm(`ステータスを「${label}」に進めますか？`)) return
    setError(null)
    startTransition(async () => {
      const result = await advanceEvaluationFlow({ sheet_id: sheet.id, to_status: toStatus })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">自己評価シート</h1>
            <p className="mt-0.5 text-xs text-gray-500">{template.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FLOW_STATUS_COLORS[sheet.flow_status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {FLOW_STATUS_LABELS[sheet.flow_status]}
            </span>
            {isEditable && sheet.flow_status === 'self_eval' && (
              <button
                onClick={() => handleAdvance('self_submitted')}
                disabled={isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                自己評価を提出
              </button>
            )}
            {isEditable && (sheet.flow_status === 'draft' || sheet.flow_status === 'goal_set') && (
              <button
                onClick={() => handleAdvance('self_eval')}
                disabled={isPending}
                className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                自己評価を開始
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* 評価項目（軸別） */}
        <div className="divide-y divide-gray-100 p-6">
          {AXES.map(axis => {
            const axisItems = template.items.filter(i => i.axis === axis)
            if (axisItems.length === 0) return null
            return (
              <div key={axis} className="py-4 first:pt-0 last:pb-0">
                <div
                  className={`mb-3 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${AXIS_BG[axis]} text-gray-700`}
                >
                  {AXIS_LABELS[axis]}軸
                </div>
                <div className="space-y-4">
                  {axisItems.map(item => {
                    const data = localScores.get(item.id)
                    const savedScore = scores.find(
                      s => s.item_id === item.id && s.evaluator_type === 'self'
                    )
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">{item.weight}%</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {SCORE_OPTIONS.map(s => (
                            <button
                              key={s}
                              onClick={() => isEditable && handleScoreChange(item.id, 'score', s)}
                              disabled={!isEditable}
                              className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                                data?.score === s
                                  ? 'bg-primary text-white'
                                  : 'border border-gray-300 text-gray-600 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                          {isEditable && (
                            <button
                              onClick={() => handleSaveScore(item.id)}
                              disabled={isPending || data?.score == null}
                              className="ml-2 rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                            >
                              保存
                            </button>
                          )}
                        </div>
                        {isEditable ? (
                          <textarea
                            value={data?.comment ?? ''}
                            onChange={e => handleScoreChange(item.id, 'comment', e.target.value)}
                            placeholder="コメント（任意）"
                            rows={2}
                            className="mt-2 w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                        ) : (
                          savedScore?.comment && (
                            <p className="mt-2 text-xs text-gray-500">{savedScore.comment}</p>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* MBO目標セクション */}
        {hasMboItems && (
          <div className="border-t border-gray-200 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">MBO目標</h2>
              {isEditable && (
                <button
                  onClick={() => setShowGoalForm(v => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + 目標を追加
                </button>
              )}
            </div>

            {showGoalForm && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={e => setGoalTitle(e.target.value)}
                    placeholder="目標タイトル *"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <textarea
                    value={goalDetail}
                    onChange={e => setGoalDetail(e.target.value)}
                    placeholder="目標詳細（任意）"
                    rows={2}
                    className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowGoalForm(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    disabled={isPending}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddGoal}
                    disabled={isPending || !goalTitle.trim()}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}

            {goals.length === 0 ? (
              <p className="text-xs text-gray-400">目標が登録されていません</p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal, idx) => (
                  <div key={goal.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-medium text-gray-800">
                      {idx + 1}. {goal.goal_title}
                    </p>
                    {goal.goal_detail && (
                      <p className="mt-0.5 text-xs text-gray-500">{goal.goal_detail}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
