'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { GrowthJourneyData } from '../types'
import { MilestoneTimeline } from './MilestoneTimeline'
import { confirmCareerGoal, sendAdviceComment, replyConsultation } from '../actions'
import { APP_ROUTES } from '@/config/routes'

interface GrowthJourneyBoardProps {
  data: GrowthJourneyData
  isManager: boolean
}

export function GrowthJourneyBoard({ data, isManager }: GrowthJourneyBoardProps) {
  const [adviceText, setAdviceText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  const diffRate = data.achievement_rate - data.prev_month_rate
  const hasProposedGoal = data.goal?.status === 'proposed'

  async function handleConfirmGoal() {
    setSubmitting(true)
    const result = await confirmCareerGoal({ employeeId: data.employee_id })
    setSubmitting(false)
    if (!result.success) alert((result as { success: false; error: string }).error)
  }

  async function handleSendAdvice() {
    if (!adviceText.trim()) return
    setSubmitting(true)
    const result = await sendAdviceComment({
      employeeId: data.employee_id,
      comment: adviceText.trim(),
    })
    setSubmitting(false)
    if (result.success) setAdviceText('')
    else alert((result as { success: false; error: string }).error)
  }

  async function handleReplyConsultation(consultationId: string) {
    const reply = replyText[consultationId]
    if (!reply?.trim()) return
    setSubmitting(true)
    const result = await replyConsultation({ consultationId, reply: reply.trim() })
    setSubmitting(false)
    if (result.success) setReplyText(prev => ({ ...prev, [consultationId]: '' }))
    else alert((result as { success: false; error: string }).error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        {isManager ? (
          <Link
            href={APP_ROUTES.TENANT.SKILL_APPROVALS}
            className="text-sm text-gray-500 hover:text-primary"
          >
            ← チーム育成一覧
          </Link>
        ) : (
          <Link
            href={APP_ROUTES.TENANT.MY_SKILLS}
            className="text-sm text-gray-500 hover:text-primary"
          >
            ← マイスキルに戻る
          </Link>
        )}
        <span className="text-gray-300">|</span>
        <h1 className="text-base font-bold text-gray-800">
          {isManager ? `${data.employee_name ?? ''}さんの育成ジャーニー` : '私の育成ジャーニー'}
        </h1>
      </div>

      {!isManager && hasProposedGoal && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800">上司から目標提案が届きました</p>
            {data.goal?.message && (
              <p className="text-xs text-blue-600 mt-0.5">{data.goal.message}</p>
            )}
          </div>
          <button
            onClick={handleConfirmGoal}
            disabled={submitting}
            className="bg-primary text-white text-sm rounded px-4 py-1.5 hover:bg-blue-600 disabled:opacity-50"
          >
            承認する
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 flex gap-4">
        <aside className="w-56 shrink-0 space-y-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">目標職種</p>
            <p className="text-base font-bold text-primary">{data.goal?.skill_name ?? '未設定'}</p>
            {data.goal?.target_date && (
              <p className="text-xs text-gray-500 mt-0.5">
                期限:{' '}
                {new Date(data.goal.target_date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                })}
              </p>
            )}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>達成率</span>
                <span className="font-bold text-primary">{data.achievement_rate}%</span>
              </div>
              <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${data.achievement_rate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">先月比</p>
            <p className={`text-lg font-bold ${diffRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {diffRate >= 0 ? '+' : ''}
              {diffRate}%
            </p>
          </div>

          {!isManager && (
            <Link
              href={APP_ROUTES.TENANT.MY_SKILLS_JOURNEY_CONSULT}
              className="block bg-orange-50 border border-orange-200 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors"
            >
              <p className="text-lg">💬</p>
              <p className="text-xs font-semibold text-accent-orange mt-1">上司に相談する</p>
            </Link>
          )}

          {data.recommended_course && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-400 mb-1">おすすめコース</p>
              <p className="text-xs font-semibold text-gray-700 line-clamp-2">
                {data.recommended_course.title}
              </p>
            </div>
          )}
        </aside>

        <main className="flex-1 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <MilestoneTimeline
              milestones={data.milestones}
              isManager={isManager}
              onProposeMilestone={
                isManager
                  ? () => {
                      window.location.href = APP_ROUTES.TENANT.SKILL_JOURNEY_PROPOSE(
                        data.employee_id
                      )
                    }
                  : undefined
              }
            />
          </div>

          {isManager && data.open_consultations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 mb-3">
                🚨 未返答の相談（{data.open_consultations.length}件）
              </h3>
              {data.open_consultations.map(c => (
                <div key={c.id} className="mb-4 last:mb-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {c.category_tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-red-100 text-red-600 rounded px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {c.message && <p className="text-sm text-gray-700 mb-2">{c.message}</p>}
                  <div className="flex gap-2">
                    <input
                      value={replyText[c.id] ?? ''}
                      onChange={e => setReplyText(prev => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="返答を入力..."
                      className="flex-1 text-sm border rounded px-3 py-1.5"
                    />
                    <button
                      onClick={() => handleReplyConsultation(c.id)}
                      disabled={submitting}
                      className="bg-red-500 text-white text-sm rounded px-3 py-1.5 hover:bg-red-600 disabled:opacity-50"
                    >
                      返答
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isManager && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">アドバイスを送る</h3>
              <div className="flex gap-2">
                <textarea
                  value={adviceText}
                  onChange={e => setAdviceText(e.target.value)}
                  placeholder="メンバーへのアドバイスやメッセージを入力..."
                  rows={3}
                  className="flex-1 text-sm border rounded px-3 py-2 resize-none"
                />
                <button
                  onClick={handleSendAdvice}
                  disabled={submitting || !adviceText.trim()}
                  className="bg-primary text-white text-sm rounded px-4 py-2 hover:bg-blue-600 disabled:opacity-50 self-end"
                >
                  送信
                </button>
              </div>
            </div>
          )}

          {data.feedback_comments.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">上司からのアドバイス</h3>
              <div className="space-y-3">
                {data.feedback_comments.map(c => (
                  <div key={c.id} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        {c.sender_name ?? '上司'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
