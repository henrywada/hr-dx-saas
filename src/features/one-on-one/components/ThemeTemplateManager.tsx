'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addThemeTemplate, deactivateThemeTemplate } from '../actions'
import type { ThemeTemplate } from '../types'

interface Props {
  templates: ThemeTemplate[]
}

/** 1on1 テーマテンプレートの追加・無効化を管理するパネル */
export function ThemeTemplateManager({ templates }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('テーマ名は必須です')
      return
    }
    setLoading(true)
    setError(null)
    const result = await addThemeTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      sortOrder: templates.length,
    })
    setLoading(false)
    if (result.success) {
      setName('')
      setDescription('')
      router.refresh()
    } else {
      setError(result.error ?? '追加に失敗しました')
    }
  }

  async function handleDeactivate(t: ThemeTemplate) {
    if (!confirm(`テーマ「${t.name}」を無効化しますか？`)) return
    const result = await deactivateThemeTemplate(t.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error ?? '無効化に失敗しました')
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">テーマテンプレート</p>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs font-medium text-[#FD7601] hover:underline"
        >
          {open ? '閉じる' : '＋ テーマを追加'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.length === 0 && (
          <span className="text-xs text-gray-400">テンプレートがありません</span>
        )}
        {templates.map(t => (
          <span
            key={t.id}
            className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
            title={t.description ?? ''}
          >
            {t.name}
            <button
              onClick={() => handleDeactivate(t)}
              className="text-gray-300 hover:text-red-500"
              aria-label={`${t.name} を無効化`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {open && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="テーマ名（例: 中長期キャリア面談）"
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="説明（任意）"
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '追加中...' : '追加する'}
          </button>
        </form>
      )}
    </div>
  )
}
