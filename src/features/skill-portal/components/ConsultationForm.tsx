'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendConsultation } from '../actions'
import type { SkillConsultation } from '../types'
import { APP_ROUTES } from '@/config/routes'

const CATEGORY_OPTIONS = [
  '要件の達成方法がわからない',
  'スケジュールを変えたい',
  '目標自体を変えたい',
  'モチベーションが下がっている',
  'その他',
]

interface ConsultationFormProps {
  history: SkillConsultation[]
}

export function ConsultationForm({ history }: ConsultationFormProps) {
  const router = useRouter()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTag(tag: string) {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTags.length === 0) {
      setError('カテゴリを1つ以上選択してください')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await sendConsultation({
      categoryTags: selectedTags,
      message: message.trim() || undefined,
    })
    setSubmitting(false)
    if (result.success) router.push(APP_ROUTES.TENANT.MY_SKILLS_JOURNEY)
    else setError((result as { success: false; error: string }).error)
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-primary">
          ← 戻る
        </button>
        <h1 className="text-base font-bold text-gray-800">上司に相談する</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 space-y-4">
        {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            悩みのカテゴリ（複数選択可）*
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            詳しく教えてください（任意）
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="どんなことで困っているか、できるだけ具体的に書いてください..."
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || selectedTags.length === 0}
          className="w-full bg-accent-orange text-white text-sm font-semibold rounded py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting ? '送信中...' : '💬 相談を送る'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">過去の相談履歴</h2>
          <div className="space-y-4">
            {history.map(c => (
              <div key={c.id} className="border-l-2 border-gray-200 pl-3">
                <div className="flex flex-wrap gap-1 mb-1">
                  {c.category_tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                  <span
                    className={`text-xs rounded px-2 py-0.5 ml-auto ${
                      c.status === 'resolved'
                        ? 'bg-green-100 text-green-600'
                        : c.status === 'replied'
                          ? 'bg-[#FD7601]-10 text-[#FD7601]'
                          : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    {c.status === 'resolved'
                      ? '解決済み'
                      : c.status === 'replied'
                        ? '返答あり'
                        : '未返答'}
                  </span>
                </div>
                {c.message && <p className="text-sm text-gray-700 mb-1">{c.message}</p>}
                {c.manager_reply && (
                  <div className="bg-[#f6f8fa] rounded p-2 mt-1">
                    <p className="text-xs text-[#FD7601] font-semibold mb-0.5">上司の返答</p>
                    <p className="text-xs text-gray-700">{c.manager_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
