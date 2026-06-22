'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview } from '@/features/evaluation/360-actions'
import { APP_ROUTES } from '@/config/routes'
import type { Review360Question, ResponseInput } from '@/features/evaluation/360-types'
import { QUESTION_CATEGORY_LABELS } from '@/features/evaluation/360-types'

interface Props {
  reviewerId: string
  campaignName: string
  subjectName: string
  deadline: string
  isAnonymous: boolean
  questions: Review360Question[]
  initialResponses: Record<string, { score: number | null; comment: string }>
  isSubmitted: boolean
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const

const SCORE_LABELS: Record<number, string> = {
  1: '1：大きく改善が必要',
  2: '2：改善が必要',
  3: '3：標準的',
  4: '4：優れている',
  5: '5：非常に優れている',
}

export function ReviewAnswerForm({
  reviewerId,
  campaignName,
  subjectName,
  deadline,
  isAnonymous,
  questions,
  initialResponses,
  isSubmitted,
}: Props) {
  const router = useRouter()
  const [responses, setResponses] = useState<
    Record<string, { score: number | null; comment: string }>
  >(
    Object.fromEntries(
      questions.map(q => [q.id, initialResponses[q.id] ?? { score: null, comment: '' }])
    )
  )
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(isSubmitted)
  const [isPending, startTransition] = useTransition()

  function updateScore(questionId: string, score: number) {
    setResponses(prev => ({ ...prev, [questionId]: { ...prev[questionId], score } }))
  }

  function updateComment(questionId: string, comment: string) {
    setResponses(prev => ({ ...prev, [questionId]: { ...prev[questionId], comment } }))
  }

  function handleSubmit() {
    const unanswered = questions.filter(q => responses[q.id]?.score === null)
    if (unanswered.length > 0) {
      setError(`${unanswered.length}件の設問が未回答です。すべてのスコアを選択してください。`)
      return
    }
    setError('')
    startTransition(async () => {
      const payload: ResponseInput[] = questions.map(q => ({
        question_id: q.id,
        score: responses[q.id]?.score ?? null,
        comment: responses[q.id]?.comment ?? '',
      }))
      const result = await submitReview(reviewerId, payload)
      if (result.success === false) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#24292f]">回答が完了しました</h2>
        <p className="text-sm text-[#57606a]">ご協力ありがとうございました。</p>
        <button
          onClick={() => router.push(APP_ROUTES.EVALUATION.MY_EVALUATION_360)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90"
        >
          一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#f6f8fa] rounded-xl p-4 space-y-1">
        <h1 className="text-lg font-bold text-[#24292f]">{campaignName}</h1>
        <p className="text-sm text-[#57606a]">
          評価対象者：<span className="font-medium">{subjectName}</span>
        </p>
        <p className="text-sm text-[#57606a]">回答期限：{deadline}</p>
        {isAnonymous && (
          <p className="text-xs text-primary bg-primary/10 inline-block px-2 py-0.5 rounded-full">
            この評価は匿名で集計されます
          </p>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="border border-[#e2e6ec] rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-xs text-[#57606a] shrink-0 mt-0.5">Q{i + 1}</span>
              <div>
                <span className="text-xs px-2 py-0.5 bg-[#f6f8fa] text-[#57606a] rounded-full mr-2">
                  {QUESTION_CATEGORY_LABELS[q.category]}
                </span>
                <span className="text-sm font-medium text-[#24292f]">{q.question_text}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {SCORE_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => updateScore(q.id, s)}
                  title={SCORE_LABELS[s]}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    responses[q.id]?.score === s
                      ? 'bg-primary text-white border-primary'
                      : 'border-[#e2e6ec] text-[#57606a] hover:border-primary hover:text-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {responses[q.id]?.score && (
              <p className="text-xs text-[#57606a]">{SCORE_LABELS[responses[q.id].score!]}</p>
            )}

            <textarea
              value={responses[q.id]?.comment ?? ''}
              onChange={e => updateComment(q.id, e.target.value)}
              rows={2}
              placeholder="コメント（任意）"
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? '送信中…' : '回答を提出する'}
        </button>
      </div>
    </div>
  )
}
