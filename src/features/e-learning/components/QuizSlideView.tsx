'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { recordSlideProgress } from '../actions'
import type { ElSlide } from '../types'

interface Props {
  slide: ElSlide
  assignmentId: string
  isCompleted: boolean
  onCompleted: () => void
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect'

export function QuizSlideView({ slide, assignmentId, isCompleted, onCompleted }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>(
    isCompleted ? 'correct' : 'unanswered'
  )

  const question = slide.quiz_questions?.[0]
  if (!question) return null

  const options = question.options ?? []
  const answered = answerState !== 'unanswered'

  const handleAnswer = () => {
    if (selectedIdx === null || isPending || answered) return
    const selected = options[selectedIdx]
    const correct = selected?.is_correct ?? false
    setAnswerState(correct ? 'correct' : 'incorrect')

    startTransition(async () => {
      await recordSlideProgress(assignmentId, slide.id, correct ? 100 : 0)
      onCompleted()
    })
  }

  return (
    <div className="space-y-5">
      {slide.title && <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>}

      <p className="text-base text-gray-700 font-medium leading-relaxed">
        {question.question_text}
      </p>

      <div className="space-y-3">
        {options.map((opt, idx) => {
          let cls = 'border-gray-200 bg-white'
          if (answered) {
            if (opt.is_correct) cls = 'border-green-500 bg-green-50'
            else if (idx === selectedIdx) cls = 'border-red-400 bg-red-50'
          } else if (idx === selectedIdx) {
            cls = 'border-blue-500 bg-blue-50'
          }

          return (
            <button
              key={opt.id}
              disabled={answered || isPending}
              onClick={() => setSelectedIdx(idx)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm leading-snug disabled:cursor-default ${cls}`}
            >
              <span className="mr-2 font-semibold text-gray-400">
                {String.fromCharCode(65 + idx)}.
              </span>
              {opt.option_text}
            </button>
          )
        })}
      </div>

      {!answered && (
        <button
          onClick={handleAnswer}
          disabled={selectedIdx === null || isPending}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
        >
          {isPending ? '記録中...' : '回答する'}
        </button>
      )}

      {answered && (
        <div
          className={`rounded-xl p-4 space-y-2 ${
            answerState === 'correct'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {answerState === 'correct' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700">正解！</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-600">不正解</span>
              </>
            )}
          </div>
          {question.explanation && (
            <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}
