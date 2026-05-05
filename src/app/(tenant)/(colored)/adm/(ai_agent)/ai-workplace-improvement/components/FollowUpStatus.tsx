'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { X, Trash2 } from 'lucide-react'
import {
  deleteImprovementPlan,
  fetchDistributionStats,
  fetchImprovementPlans,
  updateImprovementPlan,
} from '@/features/adm/ai-workplace-improvement/actions'
import type { DivisionTreeNode } from '@/features/adm/ai-workplace-improvement/actions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ImprovementPlan } from '@/features/adm/ai-workplace-improvement/queries'

function buildPath(id: string | null, nodeMap: Map<string, DivisionTreeNode>): string | null {
  if (!id) return null
  const parts: string[] = []
  let current: string | null = id
  while (current) {
    const node = nodeMap.get(current)
    if (!node) break
    parts.unshift(node.name)
    current = node.parent_id
  }
  return parts.length > 0 ? parts.join('/') : null
}

interface FollowUpStatusProps {
  plans: ImprovementPlan[]
  onRefresh: () => void
}

/**
 * 登録済み改善計画一覧 & 前回比効果測定グラフ
 *
 * 第8章準拠｜PDCAサイクルのフォロー測定
 */
export default function FollowUpStatus({ plans, onRefresh }: FollowUpStatusProps) {
  const [selectedPlan, setSelectedPlan] = useState<ImprovementPlan | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [nodeMap, setNodeMap] = useState<Map<string, DivisionTreeNode>>(new Map())

  useEffect(() => {
    fetchDistributionStats().then(result => {
      if (result.success && result.divisions) {
        setNodeMap(new Map(result.divisions.map(d => [d.id, d])))
      }
    })
  }, [])

  const [editStatus, setEditStatus] = useState<string>('')
  const [editScore, setEditScore] = useState<string>('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  useEffect(() => {
    if (selectedPlan) {
      setEditStatus(selectedPlan.status)
      setEditScore(
        selectedPlan.actual_effect_score != null ? String(selectedPlan.actual_effect_score) : ''
      )
      setSaveError(null)
    }
  }, [selectedPlan])

  const handleSave = () => {
    if (!selectedPlan) return
    setSaveError(null)
    const scoreNum = editScore.trim() !== '' ? Number(editScore) : null
    startSaveTransition(async () => {
      const result = await updateImprovementPlan(selectedPlan.id, {
        status: editStatus,
        actual_effect_score: scoreNum,
      })
      if (result.success) {
        setSelectedPlan(null)
        onRefresh()
      } else {
        setSaveError(result.error || '保存に失敗しました。')
      }
    })
  }

  const handleDelete = () => {
    if (!selectedPlan) return
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteImprovementPlan(selectedPlan.id)
      if (result.success) {
        setSelectedPlan(null)
        onRefresh()
      } else {
        setDeleteError(result.error || '削除に失敗しました。')
      }
    })
  }
  // 効果測定対象（follow_up_date が過ぎているもの）
  const followUpPlans = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return plans.filter(p => p.follow_up_date && p.follow_up_date <= today)
  }, [plans])

  // グラフ用データ（actual_effect_score があるもの）
  const chartData = useMemo(() => {
    return followUpPlans
      .filter(p => p.actual_effect_score != null)
      .map(p => ({
        name: p.ai_generated_title.slice(0, 12) + (p.ai_generated_title.length > 12 ? '…' : ''),
        fullName: p.ai_generated_title,
        score: p.actual_effect_score ?? 0,
        date: p.follow_up_date,
      }))
  }, [followUpPlans])

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      提案済: '提案済',
      実行登録: '実行登録',
      実施中: '実施中',
      完了: '完了',
      キャンセル: 'キャンセル',
    }
    return map[s] ?? s
  }

  const statusVariant = (s: string): 'primary' | 'teal' | 'orange' | 'neutral' => {
    if (s === '完了') return 'teal'
    if (s === '実施中' || s === '実行登録') return 'primary'
    if (s === 'キャンセル') return 'neutral'
    return 'orange'
  }

  return (
    <div className="space-y-8">
      <section>
        {plans.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 border-dashed">
            まだ登録された改善計画はありません。上でAI提案を生成し、登録してください。
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => (
              <Card
                key={plan.id}
                className="p-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {plan.division_id && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          {buildPath(plan.division_id, nodeMap) ?? plan.division_name ?? ''}
                        </span>
                      )}
                      <h3 className="font-semibold text-slate-900 truncate">
                        {plan.ai_generated_title}
                      </h3>
                      <Badge variant={statusVariant(plan.status)}>{statusLabel(plan.status)}</Badge>
                      <Badge variant="neutral">{plan.priority}</Badge>
                    </div>
                    {plan.expected_effect && (
                      <p className="text-sm text-slate-600 line-clamp-2">{plan.expected_effect}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      登録日:{' '}
                      {format(new Date(plan.created_at), 'yyyy/MM/dd', {
                        locale: ja,
                      })}
                      {plan.follow_up_date && (
                        <>
                          {' '}
                          | フォロー予定:{' '}
                          {format(new Date(plan.follow_up_date), 'yyyy/MM/dd', {
                            locale: ja,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 self-center">詳細 →</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* オリジナル計画詳細モーダル */}
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedPlan(null)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-lg font-bold text-slate-900">改善計画詳細</h3>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusVariant(selectedPlan.status)}>
                    {statusLabel(selectedPlan.status)}
                  </Badge>
                  <Badge variant="neutral">{selectedPlan.priority}</Badge>
                </div>

                {selectedPlan.division_id && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">対象部署</p>
                    <p className="text-sm text-slate-700 font-medium">
                      {buildPath(selectedPlan.division_id, nodeMap) ??
                        selectedPlan.division_name ??
                        ''}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">提案タイトル</p>
                  <p className="font-bold text-slate-900 text-lg">
                    {selectedPlan.ai_generated_title}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">AI提案の根拠</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">
                    {selectedPlan.ai_reason}
                  </p>
                </div>

                {selectedPlan.proposed_actions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">具体的なアクション</p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3">
                      {selectedPlan.proposed_actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPlan.expected_effect && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">期待効果</p>
                    <p className="text-sm text-slate-700">{selectedPlan.expected_effect}</p>
                  </div>
                )}

                <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 space-y-1">
                  <p>
                    登録日:{' '}
                    {format(new Date(selectedPlan.created_at), 'yyyy/MM/dd', { locale: ja })}
                  </p>
                  {selectedPlan.follow_up_date && (
                    <p>
                      フォロー予定:{' '}
                      {format(new Date(selectedPlan.follow_up_date), 'yyyy/MM/dd', { locale: ja })}
                    </p>
                  )}
                </div>

                {/* Step 5: フォローアップ入力 */}
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 space-y-3">
                  <p className="text-xs font-bold text-blue-700">フォローアップ入力（ステップ5）</p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ステータス
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="提案済">提案済</option>
                      <option value="実行登録">実行登録</option>
                      <option value="実施中">実施中</option>
                      <option value="完了">完了</option>
                      <option value="キャンセル">キャンセル</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      効果スコア（1〜5）
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={editScore}
                      onChange={e => setEditScore(e.target.value)}
                      placeholder="フォロー後に入力"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      フォロー調査完了後に入力（1:ほぼ改善なし〜5:大幅改善）
                    </p>
                  </div>

                  {saveError && (
                    <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                      {saveError}
                    </p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : 'フォロー情報を保存'}
                  </button>
                </div>

                {deleteError && (
                  <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                    {deleteError}
                  </p>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isPending ? '削除中...' : 'この計画を削除'}
                  </button>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 前回比効果測定グラフ */}
      {chartData.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">フォロー調査後の効果測定</h2>
          <Card className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: '効果スコア（1〜5）',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
                          <p className="font-semibold text-slate-900 mb-1">{d.fullName}</p>
                          <p className="text-slate-600">効果スコア: {d.score}</p>
                          {d.date && <p className="text-slate-500 text-xs">フォロー日: {d.date}</p>}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="score" name="効果スコア" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              ※ 効果スコアはフォロー調査時に手動で入力する想定です（actual_effect_score）
            </p>
          </Card>
        </section>
      )}
    </div>
  )
}
