'use client'

import { useState, useTransition } from 'react'
import { saveQuestions } from '@/features/evaluation/360-actions'
import type { Review360Question, QuestionInput, QuestionCategory } from '@/features/evaluation/360-types'
import { QUESTION_CATEGORY_LABELS } from '@/features/evaluation/360-types'

const CATEGORIES: QuestionCategory[] = [
  'leadership', 'communication', 'execution', 'collaboration', 'development',
]

interface Props {
  campaignId: string
  initialQuestions: Review360Question[]
  disabled?: boolean
}

function newQuestion(sort_order: number): QuestionInput {
  return { question_text: '', category: 'leadership', sort_order }
}

export function QuestionEditor({ campaignId, initialQuestions, disabled }: Props) {
  const [questions, setQuestions] = useState<QuestionInput[]>(
    initialQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      category: q.category as QuestionCategory,
      sort_order: q.sort_order,
    }))
  )
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function addQuestion() {
    setQuestions(prev => [...prev, newQuestion(prev.length)])
    setSaved(false)
  }

  function removeQuestion(index: number) {
    setQuestions(prev =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, sort_order: i }))
    )
    setSaved(false)
  }

  function updateQuestion(index: number, key: keyof QuestionInput, value: string | number) {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [key]: value } : q)))
    setSaved(false)
  }

  function handleSave() {
    const invalid = questions.some(q => !q.question_text.trim())
    if (invalid) {
      setError('空の設問があります。内容を入力してください。')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await saveQuestions(campaignId, questions)
      if (result.success === false) { setError(result.error); return }
      setSaved(true)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">評価設問一覧</h3>
        {!disabled && (
          <button
            onClick={addQuestion}
            className="text-xs px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            + 設問を追加
          </button>
        )}
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-slate-400 py-4 text-center">設問がありません</p>
      )}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div
            key={i}
            className="flex gap-2 items-start border border-slate-200 rounded-lg p-3 bg-slate-50"
          >
            <span className="text-xs text-slate-400 mt-2 w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={q.question_text}
                onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                disabled={disabled}
                placeholder="評価設問を入力"
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-white disabled:text-slate-500"
              />
              <select
                value={q.category}
                onChange={e => updateQuestion(i, 'category', e.target.value)}
                disabled={disabled}
                className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none disabled:bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{QUESTION_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            {!disabled && (
              <button
                onClick={() => removeQuestion(i)}
                className="text-slate-400 hover:text-red-500 text-xs mt-1"
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">保存しました</p>}

      {!disabled && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '保存中…' : '設問を保存'}
          </button>
        </div>
      )}
    </div>
  )
}
