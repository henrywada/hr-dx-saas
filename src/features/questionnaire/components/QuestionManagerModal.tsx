'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  deleteQuestion,
  updateQuestion,
  addQuestion,
  getQuestionnaireDetailAction,
} from '../actions'
import type { QuestionnaireListItem, QuestionWithDetails, QuestionType } from '../types'

interface Props {
  questionnaire: QuestionnaireListItem
  onClose: () => void
}

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  radio: '単一選択',
  checkbox: '複数選択',
  rating_table: '評価表',
  text: '自由記述',
}

function EditQuestionForm({
  question,
  isDraft,
  onSaved,
  onCancel,
}: {
  question: QuestionWithDetails
  isDraft: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const [text, setText] = useState(question.question_text)
  const [isRequired, setIsRequired] = useState(question.is_required)
  const [options, setOptions] = useState(
    question.options.map(o => ({ id: o.id, option_text: o.option_text, sort_order: o.sort_order }))
  )
  const [items, setItems] = useState(
    question.items.map(it => ({ id: it.id, item_text: it.item_text, sort_order: it.sort_order }))
  )
  const [scaleLabels, setScaleLabels] = useState<string[]>(
    question.scale_labels ?? ['非常に不満', 'やや不満', 'どちらとも', 'やや満足', '非常に満足']
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!text.trim()) {
      setError('設問テキストを入力してください。')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await updateQuestion(question.id, {
        question_text: text.trim(),
        is_required: isRequired,
        ...(isDraft && (question.question_type === 'radio' || question.question_type === 'checkbox')
          ? {
              options: options.map((o, i) => ({
                id: o.id,
                option_text: o.option_text,
                sort_order: i,
              })),
            }
          : {}),
        ...(isDraft && question.question_type === 'rating_table'
          ? {
              items: items.map((it, i) => ({ id: it.id, item_text: it.item_text, sort_order: i })),
              scale_labels: scaleLabels,
            }
          : {}),
      })
      if (res.success) {
        onSaved()
      } else {
        setError(res.error ?? '更新に失敗しました。')
      }
    })
  }

  return (
    <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">設問テキスト</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={e => setIsRequired(e.target.checked)}
          className="rounded"
        />
        必須
      </label>

      {isDraft && (question.question_type === 'radio' || question.question_type === 'checkbox') && (
        <div>
          <p className="text-xs font-medium text-neutral-600 mb-1">選択肢</p>
          {options.map((o, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input
                type="text"
                value={o.option_text}
                onChange={e =>
                  setOptions(prev =>
                    prev.map((op, idx) => (idx === i ? { ...op, option_text: e.target.value } : op))
                  )
                }
                className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm"
              />
              <button
                onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setOptions(prev => [
                ...prev,
                { id: undefined, option_text: '', sort_order: prev.length },
              ])
            }
            className="text-xs text-primary hover:underline mt-1"
          >
            ＋ 選択肢追加
          </button>
        </div>
      )}

      {isDraft && question.question_type === 'rating_table' && (
        <>
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1">
              スケールラベル（カンマ区切り）
            </p>
            <input
              type="text"
              value={scaleLabels.join(',')}
              onChange={e => setScaleLabels(e.target.value.split(',').map(s => s.trim()))}
              className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1">評価項目</p>
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={it.item_text}
                  onChange={e =>
                    setItems(prev =>
                      prev.map((item, idx) =>
                        idx === i ? { ...item, item_text: e.target.value } : item
                      )
                    )
                  }
                  className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setItems(prev => [
                  ...prev,
                  { id: undefined, item_text: '', sort_order: prev.length },
                ])
              }
              className="text-xs text-primary hover:underline mt-1"
            >
              ＋ 項目追加
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? '保存中...' : '保存'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}

export default function QuestionManagerModal({ questionnaire, onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [addingType, setAddingType] = useState<QuestionType | null>(null)
  const [newText, setNewText] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])
  const [newItems, setNewItems] = useState(['', ''])
  const [newRequired, setNewRequired] = useState(true)
  const [addError, setAddError] = useState('')

  const isDraft = questionnaire.status === 'draft'

  useEffect(() => {
    let cancelled = false
    getQuestionnaireDetailAction(questionnaire.id).then(res => {
      if (!cancelled) {
        setQuestions(res.data?.questions ?? [])
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [questionnaire.id])

  function handleDelete(questionId: string) {
    if (!confirm('この設問を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteQuestion(questionId)
      if (res.success) {
        setQuestions(prev => prev.filter(q => q.id !== questionId))
      } else {
        alert(res.error ?? '削除に失敗しました。')
      }
    })
  }

  function handleSaved(questionId: string, updated: Partial<QuestionWithDetails>) {
    setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...updated } : q)))
    setEditingId(null)
    // 選択肢・評価項目が変わった場合は再取得
    getQuestionnaireDetailAction(questionnaire.id).then(res => {
      setQuestions(res.data?.questions ?? [])
    })
  }

  function resetAddForm() {
    setAddingType(null)
    setNewText('')
    setNewOptions(['', ''])
    setNewItems(['', ''])
    setNewRequired(true)
    setAddError('')
  }

  function handleAdd() {
    if (!addingType || !newText.trim()) {
      setAddError('設問テキストを入力してください。')
      return
    }
    setAddError('')
    const sortOrder = questions.length
    const opts =
      addingType === 'radio' || addingType === 'checkbox'
        ? newOptions.filter(o => o.trim()).map((o, i) => ({ option_text: o.trim(), sort_order: i }))
        : []
    const itms =
      addingType === 'rating_table'
        ? newItems.filter(it => it.trim()).map((it, i) => ({ item_text: it.trim(), sort_order: i }))
        : []
    startTransition(async () => {
      const res = await addQuestion(questionnaire.id, {
        question_type: addingType,
        question_text: newText.trim(),
        is_required: newRequired,
        sort_order: sortOrder,
        options: opts.length > 0 ? opts : undefined,
        items: itms.length > 0 ? itms : undefined,
      })
      if (res.success) {
        resetAddForm()
        const detailRes = await getQuestionnaireDetailAction(questionnaire.id)
        setQuestions(detailRes.data?.questions ?? [])
      } else {
        setAddError(res.error ?? '設問追加に失敗しました。')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-neutral-800">設問管理</h2>
            <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs">
              {questionnaire.title}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">
            ✕
          </button>
        </div>

        {/* 本体 */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-neutral-400 py-8 text-center">読み込み中...</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">設問がありません。</p>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="border border-neutral-200 rounded-lg p-4">
                {editingId === q.id ? (
                  <EditQuestionForm
                    question={q}
                    isDraft={isDraft}
                    onSaved={() => handleSaved(q.id, {})}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-neutral-400 mr-2">Q{idx + 1}</span>
                        <span className="text-xs bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5 mr-2">
                          {QUESTION_TYPE_LABEL[q.question_type as QuestionType]}
                        </span>
                        {q.is_required && <span className="text-xs text-red-500 mr-2">必須</span>}
                        <p className="text-sm text-neutral-800 mt-1">{q.question_text}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(q.id)}>
                          編集
                        </Button>
                        {isDraft && (
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleDelete(q.id)}
                            disabled={isPending}
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    </div>
                    {(q.options.length > 0 || q.items.length > 0) && (
                      <div className="ml-4 text-xs text-neutral-500 space-y-0.5">
                        {q.options.map(o => (
                          <div key={o.id}>・{o.option_text}</div>
                        ))}
                        {q.items.map(it => (
                          <div key={it.id}>・{it.item_text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* 設問追加（draft のみ） */}
          {isDraft && (
            <div className="border border-dashed border-neutral-300 rounded-lg p-4">
              {addingType === null ? (
                <div>
                  <p className="text-xs font-medium text-neutral-600 mb-2">設問を追加</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['radio', 'checkbox', 'rating_table', 'text'] as QuestionType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setAddingType(t)}
                        className="text-xs border border-neutral-300 rounded px-2 py-1 hover:border-primary hover:text-primary transition-colors"
                      >
                        {QUESTION_TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-neutral-600">
                    新しい設問（{QUESTION_TYPE_LABEL[addingType]}）
                  </p>
                  <textarea
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    placeholder="設問テキストを入力"
                    rows={2}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={e => setNewRequired(e.target.checked)}
                      className="rounded"
                    />
                    必須
                  </label>
                  {(addingType === 'radio' || addingType === 'checkbox') && (
                    <div>
                      <p className="text-xs font-medium text-neutral-600 mb-1">選択肢</p>
                      {newOptions.map((o, i) => (
                        <div key={i} className="flex gap-2 mb-1">
                          <input
                            type="text"
                            value={o}
                            onChange={e =>
                              setNewOptions(prev =>
                                prev.map((op, idx) => (idx === i ? e.target.value : op))
                              )
                            }
                            placeholder={`選択肢 ${i + 1}`}
                            className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() =>
                              setNewOptions(prev => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-red-400 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setNewOptions(prev => [...prev, ''])}
                        className="text-xs text-primary hover:underline"
                      >
                        ＋ 追加
                      </button>
                    </div>
                  )}
                  {addingType === 'rating_table' && (
                    <div>
                      <p className="text-xs font-medium text-neutral-600 mb-1">評価項目</p>
                      {newItems.map((it, i) => (
                        <div key={i} className="flex gap-2 mb-1">
                          <input
                            type="text"
                            value={it}
                            onChange={e =>
                              setNewItems(prev =>
                                prev.map((item, idx) => (idx === i ? e.target.value : item))
                              )
                            }
                            placeholder={`項目 ${i + 1}`}
                            className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => setNewItems(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-400 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setNewItems(prev => [...prev, ''])}
                        className="text-xs text-primary hover:underline"
                      >
                        ＋ 追加
                      </button>
                    </div>
                  )}
                  {addError && <p className="text-xs text-red-600">{addError}</p>}
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleAdd} disabled={isPending}>
                      {isPending ? '追加中...' : '追加する'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetAddForm} disabled={isPending}>
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end px-6 py-4 border-t border-neutral-200 flex-shrink-0">
          <Button variant="outline" size="md" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  )
}
