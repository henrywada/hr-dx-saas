'use client'

import { useState, useTransition } from 'react'
import type { SkillLevel } from '../types'
import { createSkillLevel, updateSkillLevel, deleteSkillLevel } from '../actions'

type Props = { levels: SkillLevel[] }

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#6b7280',
  '#0f172a',
]

export function SkillLevelManager({ levels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createSkillLevel({ name: newName.trim(), colorHex: newColor })
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
      const res = await updateSkillLevel({ id: editId, name: editName.trim(), colorHex: editColor })
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
      const res = await deleteSkillLevel(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキルレベル管理</h3>
      <p className="text-xs text-gray-500">例：初級・中級・熟練・必須 など自由に定義できます</p>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="レベル名（例：初級）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
        />
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="w-5 h-5 rounded-full border-2 transition-all"
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

      <div className="flex flex-wrap gap-2">
        {levels.length === 0 && <p className="text-xs text-gray-400">スキルレベルが未登録です。</p>}
        {levels.map(level => (
          <div
            key={level.id}
            className="flex items-center gap-1 border border-gray-200 rounded px-2 py-1"
          >
            {editId === level.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-20"
                />
                <div className="flex gap-0.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className="w-4 h-4 rounded-full border"
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
                  className="text-xs text-primary"
                >
                  保存
                </button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-400">
                  ✕
                </button>
              </>
            ) : (
              <>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: level.color_hex + '33', color: level.color_hex }}
                >
                  {level.name}
                </span>
                <button
                  onClick={() => {
                    setEditId(level.id)
                    setEditName(level.name)
                    setEditColor(level.color_hex)
                  }}
                  className="text-xs text-gray-400 hover:text-primary"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(level.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
