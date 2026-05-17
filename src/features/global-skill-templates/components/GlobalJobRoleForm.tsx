'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { GlobalJobCategory } from '../types'
import { createGlobalJobRole } from '../actions'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

type Props = {
  categories: GlobalJobCategory[]
  defaultCategoryId?: string
  /** 業種行から開いたときなど、業種プルダウンを固定する */
  lockCategorySelect?: boolean
  onClose: () => void
}

export function GlobalJobRoleForm({
  categories,
  defaultCategoryId,
  lockCategorySelect = false,
  onClose,
}: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colorHex, setColorHex] = useState('#3b82f6')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? categories[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim()) return
    if (!categoryId) {
      setError('業種カテゴリを選択してください')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await createGlobalJobRole({
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        colorHex,
      })
      if (res.success === false) {
        setError(res.error)
        return
      }
      // revalidatePath のみでは Client に渡した roles が更新されないため RSC を再取得する
      router.refresh()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">職種を追加</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">業種カテゴリ</label>
            {lockCategorySelect && (
              <p className="mb-1.5 text-xs text-gray-500">
                テーブルの業種に紐づけて追加します（変更できません）
              </p>
            )}
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={lockCategorySelect}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">職種名 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: プログラマー"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">説明（任意）</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例: Webシステムの設計・開発を担当"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カラー</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: colorHex === c ? '#374151' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !name.trim()}
            className="flex-1 bg-primary text-white py-2 rounded text-sm disabled:opacity-50"
          >
            追加
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
