'use client'

import { useState, useTransition, useRef } from 'react'
import { Upload, Sparkles, X, CheckCircle } from 'lucide-react'
import { generateCourseFromFile, saveAiGeneratedCourse } from '../actions'
import type { AiGeneratedCourse, CourseType } from '../types'

interface Props {
  courseType: CourseType
  onClose: () => void
}

export function AiGeneratePanel({ courseType, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [draft, setDraft] = useState<AiGeneratedCourse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      try {
        const result = await generateCourseFromFile(formData)
        setDraft(result)
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI生成に失敗しました')
      }
    })
  }

  const handleSave = () => {
    if (!draft) return
    startTransition(async () => {
      try {
        await saveAiGeneratedCourse(draft, courseType)
        setStep('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-800">AIでコースを自動生成</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'upload' && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <p className="text-sm text-gray-600">
                PDF・DOCX・TXT・PNG
                などの資料をアップロードすると、AIがeラーニングコースの草案を自動生成します。
              </p>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">クリックしてファイルを選択</span>
                <span className="text-xs text-gray-400 mt-1">PDF / DOCX / TXT / PNG 対応</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isPending ? 'AI生成中...' : 'コースを生成'}
                </button>
              </div>
            </form>
          )}

          {step === 'preview' && draft && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {draft.category}
                  </span>
                  <span className="text-xs text-gray-500">約{draft.estimated_minutes}分</span>
                </div>
                <h3 className="font-bold text-gray-800">{draft.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{draft.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  スライド構成（{draft.slides.length}枚）
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {draft.slides.map((slide, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-600 py-1 border-b border-gray-100"
                    >
                      <span className="text-xs w-6 text-center font-mono text-gray-400">
                        {i + 1}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          slide.slide_type === 'quiz'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {slide.slide_type === 'quiz' ? 'クイズ' : 'テキスト'}
                      </span>
                      <span className="truncate">{slide.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  やり直す
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {isPending ? '保存中...' : 'このコースを保存'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-medium text-gray-800">コースを保存しました</p>
              <p className="text-sm text-gray-500">コース一覧から内容を編集できます</p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
