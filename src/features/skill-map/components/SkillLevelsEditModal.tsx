'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { X, Pencil, Trash2, Check, X as XIcon } from 'lucide-react'
import type { SkillLevel } from '../types'
import {
  loadSkillLevelsAction,
  createSkillLevel,
  updateSkillLevel,
  deleteSkillLevel,
} from '../actions'

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

type Props = { onClose: () => void }

type EditState = { id: string; name: string; colorHex: string }

export function SkillLevelsEditModal({ onClose }: Props) {
  const [levels, setLevels] = useState<SkillLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState('#3b82f6')
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLevels(await loadSkillLevelsAction())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(level: SkillLevel) {
    setEditingId(level.id)
    setEditState({ id: level.id, name: level.name, colorHex: level.color_hex })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
    setEditError(null)
  }

  function handleAdd() {
    if (!addName.trim()) {
      setAddError('レベル名を入力してください')
      return
    }
    setAddError(null)
    startTransition(async () => {
      const res = await createSkillLevel({ name: addName.trim(), colorHex: addColor })
      if (!res.success) {
        setAddError((res as { success: false; error: string }).error)
        return
      }
      setAddName('')
      setAddColor('#3b82f6')
      void load()
    })
  }

  function handleSaveEdit() {
    if (!editState || !editState.name.trim()) {
      setEditError('レベル名を入力してください')
      return
    }
    setEditError(null)
    startTransition(async () => {
      const res = await updateSkillLevel({
        id: editState.id,
        name: editState.name.trim(),
        colorHex: editState.colorHex,
      })
      if (!res.success) {
        setEditError((res as { success: false; error: string }).error)
        return
      }
      cancelEdit()
      void load()
    })
  }

  function handleDelete(id: string, name: string) {
    if (
      !confirm(`「${name}」を削除しますか？このレベルが設定された要件のレベルが未設定になります。`)
    )
      return
    startTransition(async () => {
      await deleteSkillLevel(id)
      void load()
    })
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between bg-[#FD7601] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">スキルレベルマスタの編集</h2>
            <p className="mt-0.5 text-xs text-white/80">テナント共通のレベル一覧を管理します</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* 追加フォーム */}
          <div className="mb-5 rounded-xl border border-[#e2e6ec] bg-[#f6f8fa]/50 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-700">＋ レベルを追加</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="レベル名 *（例: 1年未満, 上級, Lv.3）"
                className="min-w-40 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#FD7601] focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAddColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: addColor === c ? '#374151' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !addName.trim()}
                className="rounded-lg bg-[#FD7601] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
            {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
          </div>

          {/* 一覧テーブル */}
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">読み込み中…</p>
          ) : levels.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">レベルが登録されていません</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      レベル名
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      カラー
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level, i) => (
                    <tr
                      key={level.id}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      {editingId === level.id && editState ? (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              value={editState.name}
                              onChange={e => setEditState({ ...editState, name: e.target.value })}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#FD7601]"
                              autoFocus
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              {PRESET_COLORS.map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditState({ ...editState, colorHex: c })}
                                  className="h-5 w-5 rounded-full border-2 transition-all"
                                  style={{
                                    backgroundColor: c,
                                    borderColor:
                                      editState.colorHex === c ? '#374151' : 'transparent',
                                  }}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {editError && <p className="mb-1 text-xs text-red-500">{editError}</p>}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isPending}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                              >
                                <XIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 font-medium text-gray-800">{level.name}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: level.color_hex + '22',
                                color: level.color_hex,
                                border: `1px solid ${level.color_hex}66`,
                              }}
                            >
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: level.color_hex }}
                              />
                              {level.color_hex}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(level)}
                                disabled={isPending}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#e2e6ec] hover:bg-[#f6f8fa] hover:text-[#FD7601] disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(level.id, level.name)}
                                disabled={isPending}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-6 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
