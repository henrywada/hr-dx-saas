'use client'

import { useState, useTransition } from 'react'
import { CandidatePulse } from '@/features/candidate-pulse/types'
import { submitPulseAnswer } from '@/features/candidate-pulse/actions'

const DEFAULT_CONCERNS_LIST = [
  '給与・待遇について',
  '業務内容について',
  '働き方（リモート/残業）について',
  '評価制度について',
  '社員の雰囲気について',
  'その他',
]

export const PulseFormUI = ({ pulse }: { pulse: CandidatePulse }) => {
  const [score, setScore] = useState<number | null>(null)
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const template = pulse.pulse_templates
  const q1Text = template?.question_1_text || '1. 今のお気持ちを5段階で教えてください'
  const q2Text = template?.question_2_text || '2. 懸念点やもっと知りたいことがあれば選択してください（複数選択可）'
  const q3Text = template?.question_3_text || '3. その他、自由にご記入ください'
  const concernsList = template?.concerns_list || DEFAULT_CONCERNS_LIST

  // すでに回答済みの場合
  if (pulse.is_answered) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">ご回答ありがとうございました</h2>
        <p className="text-sm text-gray-600">
          このアンケートは既に回答済みです。<br />
          ご協力ありがとうございました。
        </p>
      </div>
    )
  }

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!score) {
      setError('今の気持ち（スコア）を選択してください。')
      return
    }

    startTransition(async () => {
      setError(null)
      try {
        await submitPulseAnswer(pulse.id, {
          sentiment_score: score,
          concerns: selectedConcerns,
          comment,
        })
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('エラーが発生しました')
        }
      }
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">選考アンケート</h1>
      <p className="text-sm text-gray-600 mb-6">
        {pulse.candidate_name} 様、現在の率直なお気持ちをお聞かせください。
        この回答は選考結果には直接影響しません。
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">{q1Text} <span className="text-red-500">*</span></h2>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setScore(val)}
                className={`
                  flex-1 aspect-square rounded-full flex flex-col items-center justify-center text-lg font-bold transition-colors
                  ${score === val 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                `}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
            <span>不満・不安</span>
            <span>満足・安心</span>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">{q2Text}</h2>
          <div className="flex flex-wrap gap-2">
            {concernsList.map((concern) => (
              <button
                key={concern}
                type="button"
                onClick={() => toggleConcern(concern)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${selectedConcerns.includes(concern)
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-600'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}
                `}
              >
                {concern}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">{q3Text}</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="面接の感想や、今後の選考についてのご要望など..."
          />
        </section>

        <button
          type="submit"
          disabled={isPending || !score}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors mt-6"
        >
          {isPending ? '送信中...' : 'アンケートを送信する'}
        </button>
      </form>
    </div>
  )
}
