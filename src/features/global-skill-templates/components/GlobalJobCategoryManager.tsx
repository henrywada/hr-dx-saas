'use client'

import { useState, useTransition } from 'react'
import type { GlobalJobCategory } from '../types'
import {
  createGlobalJobCategory,
  updateGlobalJobCategory,
  deleteGlobalJobCategory,
} from '../actions'

type Props = {
  categories: GlobalJobCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** 管理者カード準拠: 業種リストはテーブル行相当（ゼブラ・ホバー・左線で選択） */
export function GlobalJobCategoryManager({ categories, selectedId, onSelect }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalJobCategory({ name: newName.trim() })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setNewName('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalJobCategory({ id: editId, name: editName.trim() })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setEditId(null)
      setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この業種カテゴリを削除しますか？配下の職種もすべて削除されます。')) return
    startTransition(async () => {
      const res = await deleteGlobalJobCategory(id)
      if ('error' in res) {
        setError(res.error)
        return
      }
      if (selectedId === id) onSelect(null)
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-300 bg-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">業種カテゴリ</h3>
        <p className="mt-1 text-xs text-gray-600">
          全テナント共通の業種です。クリックで職種の絞り込みと同期します。
        </p>
      </div>

      <div className="space-y-3 p-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="業種名（例：IT）"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 pb-4">
        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            業種がありません。上のフォームから追加してください。
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {categories.map((cat, idx) => (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <div className="flex gap-2 border-b border-gray-100 bg-gray-50 px-3 py-3 last:border-b-0">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isPending}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ')
                        onSelect(selectedId === cat.id ? null : cat.id)
                    }}
                    className={`flex cursor-pointer items-center gap-2 border-b border-l-4 border-gray-100 px-3 py-2.5 text-sm text-gray-800 transition-[background-color,box-shadow] duration-300 ease-out last:border-b-0 ${
                      selectedId === cat.id
                        ? 'border-l-primary bg-primary/5 hover:bg-primary/10 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]'
                        : `${
                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } border-l-transparent hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]`
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{cat.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setEditId(cat.id)
                        setEditName(cat.name)
                      }}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        handleDelete(cat.id)
                      }}
                      className="shrink-0 text-xs text-gray-400 hover:text-red-600 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
