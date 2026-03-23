'use client'

import React, { useMemo } from 'react'
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

interface FollowUpStatusProps {
  plans: ImprovementPlan[]
  onRefresh: () => void
}

/**
 * 登録済み改善計画一覧 & 前回比効果測定グラフ
 *
 * 第8章準拠｜PDCAサイクルのフォロー測定
 */
export default function FollowUpStatus({
  plans,
  onRefresh,
}: FollowUpStatusProps) {
  // 効果測定対象（follow_up_date が過ぎているもの）
  const followUpPlans = useMemo(
    () => {
      const today = new Date().toISOString().slice(0, 10)
      return plans.filter(
        (p) => p.follow_up_date && p.follow_up_date <= today
      )
    },
    [plans]
  )

  // グラフ用データ（actual_effect_score があるもの）
  const chartData = useMemo(() => {
    return followUpPlans
      .filter((p) => p.actual_effect_score != null)
      .map((p) => ({
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
      {/* 登録済み改善計画一覧 */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          登録済み改善計画一覧
        </h2>
        {plans.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 border-dashed">
            まだ登録された改善計画はありません。上でAI提案を生成し、登録してください。
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {plan.ai_generated_title}
                      </h3>
                      <Badge variant={statusVariant(plan.status)}>
                        {statusLabel(plan.status)}
                      </Badge>
                      <Badge variant="neutral">{plan.priority}</Badge>
                    </div>
                    {plan.expected_effect && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {plan.expected_effect}
                      </p>
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 前回比効果測定グラフ */}
      {chartData.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            フォロー調査後の効果測定
          </h2>
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
                          <p className="font-semibold text-slate-900 mb-1">
                            {d.fullName}
                          </p>
                          <p className="text-slate-600">
                            効果スコア: {d.score}
                          </p>
                          {d.date && (
                            <p className="text-slate-500 text-xs">
                              フォロー日: {d.date}
                            </p>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="score"
                    name="効果スコア"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
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
