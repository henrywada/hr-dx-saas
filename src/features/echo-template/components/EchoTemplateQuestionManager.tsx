'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { addEchoTemplateQuestion, deleteEchoTemplateQuestion, updateEchoTemplate } from '../actions'
import type { EchoTemplateDetail, UpdateEchoTemplateInput } from '../types'
import type { QuestionWithDetails } from '@/features/questionnaire/types'

interface Props {
  template: EchoTemplateDetail
  onClose: () => void
  onUpdated: () => void
}

export default function EchoTemplateQuestionManager({ template, onClose, onUpdated }: Props) {
  const [questions, setQuestions] = useState<QuestionWithDetails[]>(template.questions)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(template.title)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSaveTitle() {
    if (!title.trim() || title === template.title) {
      setEditingTitle(false)
      return
    }
    startTransition(async () => {
      const input: UpdateEchoTemplateInput = { title: title.trim() }
      const result = await updateEchoTemplate(template.id, input)
      if (!result.success) {
        setError(result.error ?? 'タイトル更新に失敗しました')
        return
      }
      setEditingTitle(false)
      onUpdated()
    })
  }

  function handleAddQuestion() {
    if (!newQuestionText.trim()) return
    startTransition(async () => {
      const result = await addEchoTemplateQuestion(template.id, {
        question_type: 'rating_table',
        question_text: newQuestionText.trim(),
        is_required: true,
        sort_order: questions.length,
        items: [
          { item_text: '全くそう思わない', sort_order: 0 },
          { item_text: 'あまりそう思わない', sort_order: 1 },
          { item_text: 'どちらともいえない', sort_order: 2 },
          { item_text: 'ややそう思う', sort_order: 3 },
          { item_text: 'とてもそう思う', sort_order: 4 },
        ],
      })
      if (!result.success) {
        setError(result.error ?? '設問追加に失敗しました')
        return
      }
      setNewQuestionText('')
      onUpdated()
    })
  }

  function handleDeleteQuestion(questionId: string) {
    startTransition(async () => {
      const result = await deleteEchoTemplateQuestion(questionId)
      if (!result.success) {
        setError(result.error ?? '削除に失敗しました')
        return
      }
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      onUpdated()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
              className="text-lg font-bold text-slate-800 border-b-2 border-primary outline-none bg-transparent w-full"
            />
          ) : (
            <h2
              className="text-lg font-bold text-slate-800 cursor-pointer hover:text-primary"
              onClick={() => setEditingTitle(true)}
              title="クリックでタイトル編集"
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 ml-4 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {questions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              設問がありません。下から追加してください。
            </p>
          )}
          {questions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
              <GripVertical size={16} className="text-slate-300 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0">Q{idx + 1}</span>
              <p className="flex-1 text-sm text-slate-700">{q.question_text}</p>
              <button
                onClick={() => handleDeleteQuestion(q.id)}
                disabled={isPending}
                className="text-slate-300 hover:text-red-400 shrink-0"
                title="削除"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 space-y-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestionText}
              onChange={e => setNewQuestionText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddQuestion()}
              placeholder="新しい設問テキストを入力（Enter で追加）"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAddQuestion}
              disabled={isPending || !newQuestionText.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus size={15} />
              追加
            </button>
          </div>
          <p className="text-xs text-slate-400">
            追加した設問は5段階評価（rating_table）形式で作成されます。
          </p>
        </div>
      </div>
    </div>
  )
}
