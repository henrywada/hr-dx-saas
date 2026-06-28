'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { submitCondition } from '../actions'
import { CHECKIN_QUESTION, SCORE_EMOJI, SCORE_LABEL } from '../labels'

interface Props {
  initialScore: number | null
}

const SCORES = [1, 2, 3, 4, 5]

export function CheckinWidget({ initialScore }: Props) {
  const [recordedScore, setRecordedScore] = useState<number | null>(initialScore)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSelect = (score: number) => {
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await submitCondition({ score })
        setRecordedScore(score)
        setIsEditing(false)
      } catch {
        setErrorMessage('記録に失敗しました。もう一度お試しください。')
      }
    })
  }

  if (recordedScore !== null && !isEditing) {
    return (
      <div className="relative overflow-hidden bg-white rounded-lg border-t-4 border-t-emerald-500 border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
        <div className="space-y-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            コンディション記録
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{SCORE_EMOJI[recordedScore]}</span>
            <span className="text-sm font-bold text-slate-900">
              本日「{SCORE_LABEL[recordedScore]}」で記録済みです
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold text-xs text-left"
        >
          修正する
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-lg border-t-4 border-t-emerald-500 border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="space-y-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          コンディション記録
        </span>
        <h3 className="text-sm font-bold text-slate-900 leading-snug">{CHECKIN_QUESTION}</h3>
        <div className="flex items-center justify-between gap-1">
          {SCORES.map(score => (
            <button
              key={score}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(score)}
              aria-label={SCORE_LABEL[score]}
              className="flex-1 text-3xl py-1.5 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {SCORE_EMOJI[score]}
            </button>
          ))}
        </div>
        {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
      </div>
    </div>
  )
}
