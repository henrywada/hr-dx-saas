'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { upsertSlide, upsertQuizQuestion, upsertQuizOptions } from '../actions'
import { SLIDE_TYPE_LABELS } from '../constants'
import type { ElSlide, SlideType } from '../types'

interface Props {
  slide: ElSlide
  courseId: string
  onUpdate: (updated: ElSlide) => void
}

export function SlideFormPanel({ slide, courseId, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(slide.title ?? '')
  const [content, setContent] = useState(slide.content ?? '')
  const [slideType, setSlideType] = useState<SlideType>(slide.slide_type)
  const [saved, setSaved] = useState(false)

  const firstQ = slide.quiz_questions?.[0]
  const [questionText, setQuestionText] = useState(firstQ?.question_text ?? '')
  const [explanation, setExplanation] = useState(firstQ?.explanation ?? '')
  const [options, setOptions] = useState(
    firstQ?.options?.length
      ? firstQ.options.map(o => ({ text: o.option_text, is_correct: o.is_correct }))
      : [
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ]
  )

  const handleSave = () => {
    startTransition(async () => {
      const updated = await upsertSlide({
        id: slide.id,
        course_id: courseId,
        slide_order: slide.slide_order,
        slide_type: slideType,
        title,
        content: slideType === 'text' ? content : undefined,
      })

      if (slideType === 'quiz') {
        const q = await upsertQuizQuestion({
          id: firstQ?.id,
          slide_id: slide.id,
          question_text: questionText,
          question_order: 0,
          explanation,
        })
        await upsertQuizOptions(q.id, options)
      }

      onUpdate({ ...slide, ...updated, slide_type: slideType, title, content })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">スライドタイプ</label>
          <select
            value={slideType}
            onChange={e => setSlideType(e.target.value as SlideType)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(['text', 'image', 'quiz'] as SlideType[]).map(t => (
              <option key={t} value={t}>
                {SLIDE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 mt-5"
        >
          <Save className="w-4 h-4" />
          {saved ? '保存済み ✓' : isPending ? '保存中...' : '保存'}
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="スライドタイトル"
        />
      </div>

      {slideType === 'text' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            コンテンツ（Markdown対応）
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={'# 見出し\n\n本文をここに入力します。\n\n- リスト項目1\n- リスト項目2'}
          />
        </div>
      )}

      {slideType === 'image' && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <p className="text-sm">画像アップロードは Phase 2 で対応予定です</p>
        </div>
      )}

      {slideType === 'quiz' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">問題文</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="問題文を入力"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              選択肢（正解をチェック）
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.is_correct}
                    onChange={() =>
                      setOptions(options.map((o, j) => ({ ...o, is_correct: j === i })))
                    }
                    className="text-blue-600"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e =>
                      setOptions(
                        options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o))
                      )
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`選択肢 ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">解説</label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="正解の解説を入力"
            />
          </div>
        </div>
      )}
    </div>
  )
}
