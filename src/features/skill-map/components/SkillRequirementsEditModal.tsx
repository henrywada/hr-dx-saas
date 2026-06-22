'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { X, Pencil, Trash2, Check, X as XIcon } from 'lucide-react'
import { SKILL_ITEM_CATEGORIES, type SkillRequirement, type SkillLevel } from '../types'
import {
  loadTenantSkillDetailAction,
  createSkillRequirement,
  updateSkillRequirement,
  deleteSkillRequirement,
} from '../actions'

type Props = {
  skillId: string
  skillName: string
  onClose: () => void
}

type EditState = {
  id: string
  name: string
  category: string
  levelId: string
  criteria: string
}

export function SkillRequirementsEditModal({ skillId, skillName, onClose }: Props) {
  const [requirements, setRequirements] = useState<SkillRequirement[]>([])
  const [levels, setLevels] = useState<SkillLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addLevelId, setAddLevelId] = useState('')
  const [addCriteria, setAddCriteria] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const detail = await loadTenantSkillDetailAction(skillId)
    setRequirements(detail?.requirements ?? [])
    setLevels(detail?.levels ?? [])
    setLoading(false)
  }, [skillId])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(req: SkillRequirement) {
    setEditingId(req.id)
    setEditState({
      id: req.id,
      name: req.name,
      category: req.category ?? '',
      levelId: req.level_id ?? '',
      criteria: req.criteria ?? '',
    })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
    setEditError(null)
  }

  function handleAdd() {
    if (!addName.trim()) {
      setAddError('要件名を入力してください')
      return
    }
    setAddError(null)
    startTransition(async () => {
      const res = await createSkillRequirement({
        skillId,
        name: addName.trim(),
        category: addCategory || undefined,
        levelId: addLevelId || undefined,
        criteria: addCriteria.trim() || undefined,
      })
      if (!res.success) {
        setAddError((res as { success: false; error: string }).error)
        return
      }
      setAddName('')
      setAddCategory('')
      setAddLevelId('')
      setAddCriteria('')
      void load()
    })
  }

  function handleSaveEdit() {
    if (!editState || !editState.name.trim()) {
      setEditError('要件名を入力してください')
      return
    }
    setEditError(null)
    startTransition(async () => {
      const res = await updateSkillRequirement({
        id: editState.id,
        name: editState.name.trim(),
        category: editState.category || null,
        levelId: editState.levelId || null,
        criteria: editState.criteria.trim() || null,
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
    if (!confirm(`「${name}」を削除しますか？`)) return
    startTransition(async () => {
      await deleteSkillRequirement(id)
      void load()
    })
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between bg-primary px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">スキル要件の編集</h2>
            <p className="mt-0.5 text-xs text-white/80">{skillName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* 追加フォーム */}
          <div className="mb-5 rounded-xl border border-primary/20 bg-[#f6f8fa]/50 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-700">＋ 要件を追加</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="要件名 *"
                className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={addCategory}
                onChange={e => setAddCategory(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary/40"
              >
                <option value="">カテゴリ</option>
                {SKILL_ITEM_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={addLevelId}
                onChange={e => setAddLevelId(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary/40"
              >
                <option value="">レベル</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <input
                value={addCriteria}
                onChange={e => setAddCriteria(e.target.value)}
                placeholder="達成基準・メモ"
                className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !addName.trim()}
                className="col-span-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                追加
              </button>
            </div>
            {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
          </div>

          {/* 一覧テーブル */}
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">読み込み中…</p>
          ) : requirements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">要件が登録されていません</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      要件名
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      カテゴリ
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      レベル
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                      達成基準
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req, i) => (
                    <tr
                      key={req.id}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      {editingId === req.id && editState ? (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              value={editState.name}
                              onChange={e => setEditState({ ...editState, name: e.target.value })}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary/40"
                              autoFocus
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={editState.category}
                              onChange={e =>
                                setEditState({ ...editState, category: e.target.value })
                              }
                              className="w-full rounded border border-gray-300 px-1 py-1 text-xs outline-none"
                            >
                              <option value=""></option>
                              {SKILL_ITEM_CATEGORIES.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={editState.levelId}
                              onChange={e =>
                                setEditState({ ...editState, levelId: e.target.value })
                              }
                              className="w-full rounded border border-gray-300 px-1 py-1 text-xs outline-none"
                            >
                              <option value=""></option>
                              {levels.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={editState.criteria}
                              onChange={e =>
                                setEditState({ ...editState, criteria: e.target.value })
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary/40"
                            />
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
                          <td className="px-3 py-2.5 font-medium text-gray-800">{req.name}</td>
                          <td className="px-3 py-2.5">
                            {req.category ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                                {req.category}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {req.level ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: req.level.color_hex + '22',
                                  color: req.level.color_hex,
                                  border: `1px solid ${req.level.color_hex}66`,
                                }}
                              >
                                {req.level.name}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">未設定</span>
                            )}
                          </td>
                          <td className="max-w-40 truncate px-3 py-2.5 text-xs text-gray-500">
                            {req.criteria ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(req)}
                                disabled={isPending}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(req.id, req.name)}
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
