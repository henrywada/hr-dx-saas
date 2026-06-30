'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addValueTag, deactivateValueTag, seedDefaultValueTags } from '../../actions'
import type { KudosValueTag } from '../../types'

interface Props {
  tags: KudosValueTag[]
}

export function ValueTagAdminPanel({ tags }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeTags = tags.filter(t => t.is_active)

  const handleSeed = () => {
    startTransition(async () => {
      try {
        await seedDefaultValueTags()
        router.refresh()
      } catch {
        setErrorMessage('初期タグの登録に失敗しました。')
      }
    })
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await addValueTag({ name, sortOrder: activeTags.length })
        setName('')
        router.refresh()
      } catch {
        setErrorMessage('タグの追加に失敗しました。')
      }
    })
  }

  const handleDeactivate = (id: string, tagName: string) => {
    if (!window.confirm(`「${tagName}」を無効化しますか？`)) return
    startTransition(async () => {
      try {
        await deactivateValueTag(id)
        router.refresh()
      } catch {
        setErrorMessage('タグの無効化に失敗しました。')
      }
    })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">バリュータグ設定</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            感謝・称賛投稿時に選択できるタグを管理します。
          </p>
        </div>
        {activeTags.length === 0 && (
          <button
            type="button"
            onClick={handleSeed}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            デフォルトを登録
          </button>
        )}
      </div>

      {activeTags.length === 0 ? (
        <p className="text-xs text-slate-500">有効なタグがありません。「デフォルトを登録」で初期セットを追加できます。</p>
      ) : (
        <ul className="space-y-1">
          {activeTags.map(tag => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
            >
              <span className="text-xs font-medium text-slate-800">{tag.name}</span>
              <button
                type="button"
                onClick={() => handleDeactivate(tag.id, tag.name)}
                disabled={isPending}
                className="text-xs text-rose-600 hover:underline disabled:opacity-50"
              >
                無効化
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 pt-1">
        <div className="flex-1 min-w-[160px] space-y-1">
          <label className="text-xs font-semibold text-slate-700">新規タグ</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            required
            placeholder="例: イノベーション"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>

      {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
    </div>
  )
}
