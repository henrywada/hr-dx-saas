'use client'

import { useState, useTransition } from 'react'
import type { GlobalSkillItem } from '../types'
import { createGlobalSkillItem, updateGlobalSkillItem, deleteGlobalSkillItem } from '../actions'

const CATEGORIES = ['技術', '知識', '資格', '経験'] as const

type Props = { jobRoleId: string; items: GlobalSkillItem[] }

export function GlobalSkillItemManager({ jobRoleId, items }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillItem({
        jobRoleId,
        name: newName.trim(),
        category: newCategory || undefined,
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setNewName('')
      setNewCategory('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillItem({
        id: editId,
        name: editName.trim(),
        category: editCategory || null,
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setEditId(null)
      setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('このスキル項目を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillItem(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキル項目</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="スキル名（例：Python）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-[140px]"
        />
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">カテゴリ（任意）</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-700">スキル名</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">カテゴリ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">
                  未登録
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  {editId === item.id ? (
                    <>
                      <td className="px-2 py-1.5">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="">—</option>
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={handleUpdate}
                          disabled={isPending}
                          className="text-xs text-primary font-medium mr-2"
                        >
                          保存
                        </button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-500">
                          ×
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-gray-500">{item.category ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditId(item.id)
                            setEditName(item.name)
                            setEditCategory(item.category ?? '')
                          }}
                          className="text-xs text-gray-400 hover:text-primary mr-2"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          削除
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
