'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { saveEvaluationScore, advanceEvaluationFlow } from '@/features/evaluation/actions'
import {
  AXIS_LABELS,
  FLOW_STATUS_LABELS,
  canEdit,
  type EvaluationRole,
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
  periodName: string
  employeeName: string
  primaryName: string
  secondaryName: string
  confirmerName: string
  role: EvaluationRole
}

type EvaluatorType = 'self' | 'primary' | 'secondary' | 'confirmer'

const EVALUATOR_LABELS: Record<EvaluatorType, string> = {
  self: '自己',
  primary: '一次',
  secondary: '二次',
  confirmer: '確定',
}

const AXES: EvaluationAxis[] = ['performance', 'ability', 'attitude', 'mbo']
const SCORE_OPTIONS = [1, 2, 3, 4, 5]

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

// 線形フローの次状態
const NEXT_STATUS: Partial<Record<FlowStatus, FlowStatus>> = {
  draft: 'goal_set',
  goal_set: 'self_eval',
  self_eval: 'self_submitted',
  self_submitted: 'primary_eval',
  primary_eval: 'primary_submitted',
  primary_submitted: 'secondary_eval',
  secondary_eval: 'secondary_submitted',
  secondary_submitted: 'confirming',
  confirming: 'confirmed',
}

export function AdminEvaluationSheetClient({
  sheet,
  template,
  goals,
  scores,
  periodName,
  employeeName,
  primaryName,
  secondaryName,
  confirmerName,
  role,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // hr_admin は代理入力する評価者列を選択可。それ以外は自ロールの列を編集。
  const defaultType: EvaluatorType =
    role === 'primary' || role === 'secondary' || role === 'confirmer' || role === 'self'
      ? role
      : 'primary'
  const [editType, setEditType] = useState<EvaluatorType>(defaultType)

  const canEditNow =
    role === 'hr_admin' ? !sheet.is_locked : canEdit(role, sheet.flow_status) && !sheet.is_locked

  // item_id × evaluator_type のスコア参照マップ
  const scoreMap = useMemo(() => {
    const m = new Map<string, EvaluationScore>()
    for (const s of scores) {
      if (s.item_id) m.set(`${s.item_id}:${s.evaluator_type}`, s)
    }
    return m
  }, [scores])

  const [localScore, setLocalScore] = useState<Map<string, { score?: number; comment?: string }>>(
    new Map()
  )

  function getEditValue(itemId: string): { score?: number; comment?: string } {
    const local = localScore.get(itemId)
    if (local) return local
    const saved = scoreMap.get(`${itemId}:${editType}`)
    return { score: saved?.score ?? undefined, comment: saved?.comment ?? undefined }
  }

  function setEditValue(itemId: string, patch: { score?: number; comment?: string }) {
    setLocalScore(prev => {
      const next = new Map(prev)
      next.set(itemId, { ...getEditValue(itemId), ...patch })
      return next
    })
  }

  function handleSave(itemId: string) {
    const val = getEditValue(itemId)
    setError(null)
    startTransition(async () => {
      const result = await saveEvaluationScore({
        sheet_id: sheet.id,
        item_id: itemId,
        evaluator_type: editType,
        score: val.score,
        comment: val.comment,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '保存に失敗しました')
      } else {
        setSuccess('保存しました')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      }
    })
  }

  function handleAdvance(to: FlowStatus) {
    const label = FLOW_STATUS_LABELS[to]
    if (!confirm(`ステータスを「${label}」に進めますか？`)) return
    setError(null)
    startTransition(async () => {
      const result = await advanceEvaluationFlow({ sheet_id: sheet.id, to_status: to })
      if (!result.success) {
        setError('error' in result ? result.error : '更新に失敗しました')
      } else {
        router.refresh()
      }
    })
  }

  const next = NEXT_STATUS[sheet.flow_status]
  const visibleTypes: EvaluatorType[] = ['self', 'primary', 'secondary', 'confirmer']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={APP_ROUTES.EVALUATION.ADMIN_LIST}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 評価シート一覧へ戻る
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{employeeName} さんの評価シート</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {periodName && <span className="mr-2">{periodName}</span>}
              {template.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FLOW_STATUS_COLORS[sheet.flow_status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {FLOW_STATUS_LABELS[sheet.flow_status]}
            </span>
            {sheet.final_score != null && (
              <span className="text-sm font-medium text-gray-800">
                確定 {sheet.final_score}点
                {sheet.final_grade && <span className="ml-1">（{sheet.final_grade}）</span>}
              </span>
            )}
          </div>
        </div>

        {/* 評価者情報 */}
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-600 sm:grid-cols-4">
          <div>
            <span className="text-gray-400">対象者：</span>
            {employeeName || '—'}
          </div>
          <div>
            <span className="text-gray-400">一次：</span>
            {primaryName || '未設定'}
          </div>
          <div>
            <span className="text-gray-400">二次：</span>
            {secondaryName || '未設定'}
          </div>
          <div>
            <span className="text-gray-400">確定：</span>
            {confirmerName || '未設定'}
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

        {/* 編集者・フロー操作バー */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {role === 'hr_admin' && !sheet.is_locked && (
              <>
                <span>代理入力する評価:</span>
                <select
                  value={editType}
                  onChange={e => {
                    setEditType(e.target.value as EvaluatorType)
                    setLocalScore(new Map())
                  }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                >
                  {(['self', 'primary', 'secondary', 'confirmer'] as EvaluatorType[]).map(t => (
                    <option key={t} value={t}>
                      {EVALUATOR_LABELS[t]}評価
                    </option>
                  ))}
                </select>
              </>
            )}
            {role !== 'hr_admin' && role !== 'none' && (
              <span>
                あなたの権限:{' '}
                <span className="font-medium">{EVALUATOR_LABELS[editType] ?? '—'}評価</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {role === 'primary' && sheet.flow_status === 'primary_eval' && (
              <button
                onClick={() => handleAdvance('primary_submitted')}
                disabled={isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                一次評価を提出
              </button>
            )}
            {role === 'secondary' && sheet.flow_status === 'secondary_eval' && (
              <button
                onClick={() => handleAdvance('secondary_submitted')}
                disabled={isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                二次評価を提出
              </button>
            )}
            {role === 'confirmer' && sheet.flow_status === 'confirming' && (
              <button
                onClick={() => handleAdvance('confirmed')}
                disabled={isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                評価を確定する
              </button>
            )}
            {role === 'hr_admin' && next && !sheet.is_locked && (
              <button
                onClick={() => handleAdvance(next)}
                disabled={isPending}
                className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                {next === 'confirmed' ? '評価を確定する' : `「${FLOW_STATUS_LABELS[next]}」へ進める`}
              </button>
            )}
          </div>
        </div>

        {/* 評価項目（軸別・評価者横並び） */}
        <div className="divide-y divide-gray-100 p-6">
          {AXES.map(axis => {
            const axisItems = template.items.filter(i => i.axis === axis)
            if (axisItems.length === 0) return null
            return (
              <div key={axis} className="py-4 first:pt-0 last:pb-0">
                <div className="mb-3 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {AXIS_LABELS[axis]}軸
                </div>
                <div className="space-y-4">
                  {axisItems.map(item => {
                    const editVal = getEditValue(item.id)
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <span className="shrink-0 text-xs text-gray-400">{item.weight}%</span>
                        </div>

                        {/* 各評価者のスコア（参照） */}
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {visibleTypes.map(t => {
                            const s = scoreMap.get(`${item.id}:${t}`)
                            return (
                              <div
                                key={t}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center"
                              >
                                <p className="text-[10px] text-gray-400">{EVALUATOR_LABELS[t]}</p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {s?.score ?? '—'}
                                </p>
                              </div>
                            )
                          })}
                        </div>

                        {/* 編集（自ロール or hr_admin が選択した評価者列） */}
                        {canEditNow && (
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                            <p className="mb-1.5 text-[11px] font-medium text-gray-600">
                              {EVALUATOR_LABELS[editType]}評価の入力
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {SCORE_OPTIONS.map(s => (
                                <button
                                  key={s}
                                  onClick={() => setEditValue(item.id, { score: s })}
                                  className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                                    editVal.score === s
                                      ? 'bg-primary text-white'
                                      : 'border border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                              <button
                                onClick={() => handleSave(item.id)}
                                disabled={isPending || editVal.score == null}
                                className="ml-2 rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                              >
                                保存
                              </button>
                            </div>
                            <textarea
                              value={editVal.comment ?? ''}
                              onChange={e => setEditValue(item.id, { comment: e.target.value })}
                              placeholder="コメント（任意）"
                              rows={2}
                              className="mt-2 w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* MBO目標（参照） */}
        {goals.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">MBO目標</h2>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={goal.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {idx + 1}. {goal.goal_title}
                    {goal.weight ? (
                      <span className="ml-2 text-xs text-gray-400">{goal.weight}%</span>
                    ) : null}
                  </p>
                  {goal.goal_detail && (
                    <p className="mt-0.5 text-xs text-gray-500">{goal.goal_detail}</p>
                  )}
                  {goal.kpi_target && (
                    <p className="mt-0.5 text-xs text-gray-500">目標値: {goal.kpi_target}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
