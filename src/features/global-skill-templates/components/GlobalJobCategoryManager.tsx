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
      if ('error' in res) { setError(res.error); return }
      setNewName('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalJobCategory({ id: editId, name: editName.trim() })
      if ('error' in res) { setError(res.error); return }
      setEditId(null)
      setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この業種カテゴリを削除しますか？配下の職種もすべて削除されます。')) return
    startTransition(async () => {
      const res = await deleteGlobalJobCategory(id)
      if ('error' in res) { setError(res.error); return }
      if (selectedId === id) onSelect(null)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">業種カテゴリ</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="業種名（例：IT）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <div className="space-y-1">
        {categories.map(cat => (
          <div key={cat.id}>
            {editId === cat.id ? (
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                />
                <button onClick={handleUpdate} disabled={isPending} className="text-xs text-primary font-medium">保存</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500">×</button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 px-3 py-2 rounded cursor-pointer text-sm ${selectedId === cat.id ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
              >
                <span className="flex-1">{cat.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); setEditId(cat.id); setEditName(cat.name) }}
                  className={`text-xs ${selectedId === cat.id ? 'text-white/70' : 'text-gray-400 hover:text-primary'}`}
                >
                  編集
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(cat.id) }}
                  className={`text-xs ${selectedId === cat.id ? 'text-white/70' : 'text-gray-400 hover:text-red-500'}`}
                >
                  削除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
