'use client'

import { useState, useTransition } from 'react'
import type { GlobalSkillLevel } from '../types'
import { createGlobalSkillLevel, updateGlobalSkillLevel, deleteGlobalSkillLevel } from '../actions'

const COLORS = ['#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

type Props = { jobRoleId: string; levels: GlobalSkillLevel[] }

export function GlobalSkillLevelManager({ jobRoleId, levels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newCriteria, setNewCriteria] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCriteria, setEditCriteria] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillLevel({
        jobRoleId,
        name: newName.trim(),
        criteria: newCriteria.trim() || undefined,
        colorHex: newColor,
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setNewName('')
      setNewCriteria('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillLevel({
        id: editId,
        name: editName.trim(),
        criteria: editCriteria.trim() || null,
        colorHex: editColor,
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
    if (!confirm('このスキルレベルを削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillLevel(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキルレベル</h3>
      {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</p>}

      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="レベル名（例：初級）"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
        />
        <input
          type="text"
          value={newCriteria}
          onChange={e => setNewCriteria(e.target.value)}
          placeholder="達成基準（例：経験3年以上）"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-[160px]"
        />
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: newColor === c ? '#374151' : 'transparent',
              }}
            />
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <div className="space-y-2">
        {levels.map(level => (
          <div
            key={level.id}
            className="flex items-center gap-2 p-2 border border-gray-200 rounded"
          >
            {editId === level.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                />
                <input
                  value={editCriteria}
                  onChange={e => setEditCriteria(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        backgroundColor: c,
                        borderColor: editColor === c ? '#374151' : 'transparent',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleUpdate}
                  disabled={isPending}
                  className="text-xs text-primary font-medium"
                >
                  保存
                </button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500">
                  ×
                </button>
              </>
            ) : (
              <>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: level.color_hex + '33', color: level.color_hex }}
                >
                  {level.name}
                </span>
                <span className="text-xs text-gray-500 flex-1">{level.criteria ?? '—'}</span>
                <button
                  onClick={() => {
                    setEditId(level.id)
                    setEditName(level.name)
                    setEditCriteria(level.criteria ?? '')
                    setEditColor(level.color_hex)
                  }}
                  className="text-xs text-gray-400 hover:text-primary"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(level.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  削除
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
