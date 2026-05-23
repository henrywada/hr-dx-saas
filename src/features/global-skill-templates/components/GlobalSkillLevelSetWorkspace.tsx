'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useMemo, useState, useTransition } from 'react'
import type { GlobalSkillLevel, GlobalSkillLevelSetWithLevels } from '../types'
import {
  createGlobalSkillLevel,
  createGlobalSkillLevelSet,
  deleteGlobalSkillLevel,
  deleteGlobalSkillLevelSet,
  updateGlobalSkillLevel,
  updateGlobalSkillLevelSet,
} from '../actions'
import { globalTemplateActionError, SKILL_ITEM_CATEGORIES } from '../types'

const LEVEL_COLORS = ['#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] as const

type Props = {
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
  onMutationSuccess?: () => void
}

function sortLevels(levels: GlobalSkillLevel[]): GlobalSkillLevel[] {
  return [...levels].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

/** セット内の次の sort_order（末尾+1） */
function nextSortOrder(levels: GlobalSkillLevel[]): number {
  if (levels.length === 0) return 0
  return Math.max(...levels.map(l => l.sort_order)) + 1
}

/** スキルレベルセットをテーブルで登録し、セット単位でレベル（詳細説明付き）を CRUD（職種と非連動） */
export function GlobalSkillLevelSetWorkspace({ skillLevelSets, onMutationSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const sortedSets = useMemo(
    () =>
      [...skillLevelSets].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [skillLevelSets]
  )

  const [newSetName, setNewSetName] = useState('')
  const [newSetCategory, setNewSetCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [editSetId, setEditSetId] = useState<string | null>(null)
  const [editSetName, setEditSetName] = useState('')
  const [editSetCategory, setEditSetCategory] = useState('')

  const [addingForSetId, setAddingForSetId] = useState<string | null>(null)
  const [newLvName, setNewLvName] = useState('')
  const [newLvCriteria, setNewLvCriteria] = useState('')
  const [newLvSortOrder, setNewLvSortOrder] = useState(0)
  const [newLvColor, setNewLvColor] = useState<string>(LEVEL_COLORS[0])

  const [editLvId, setEditLvId] = useState<string | null>(null)
  const [editLvName, setEditLvName] = useState('')
  const [editLvCriteria, setEditLvCriteria] = useState('')
  const [editLvSortOrder, setEditLvSortOrder] = useState(0)
  const [editLvColor, setEditLvColor] = useState('')

  function handleRegisterSet() {
    if (!newSetName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillLevelSet({
        name: newSetName.trim(),
        category: newSetCategory || undefined,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setNewSetName('')
      setNewSetCategory('')
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleSaveSetName() {
    if (!editSetId || !editSetName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillLevelSet({
        id: editSetId,
        name: editSetName.trim(),
        category: editSetCategory || null,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setEditSetId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDeleteSet(id: string) {
    if (
      !confirm(
        'このスキルを削除しますか？セット内のレベル定義に加え、職種テンプレートでこのスキルを参照している項目もあわせて削除されます。'
      )
    )
      return
    startTransition(async () => {
      const res = await deleteGlobalSkillLevelSet({ id })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setError(null)
      setEditSetId(null)
      setAddingForSetId(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleAddLevel(setId: string) {
    if (!newLvName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillLevel({
        skillLevelSetId: setId,
        name: newLvName.trim(),
        criteria: newLvCriteria.trim() || undefined,
        colorHex: newLvColor,
        sortOrder: newLvSortOrder,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setNewLvName('')
      setNewLvCriteria('')
      setNewLvSortOrder(0)
      setNewLvColor(LEVEL_COLORS[0])
      setAddingForSetId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleSaveLevel() {
    if (!editLvId || !editLvName.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillLevel({
        id: editLvId,
        name: editLvName.trim(),
        criteria: editLvCriteria.trim() || null,
        colorHex: editLvColor,
        sortOrder: editLvSortOrder,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setEditLvId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDeleteLevel(id: string) {
    if (!confirm('このスキルレベルを削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillLevel({ id })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setEditLvId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-level-set-name" className="text-xs font-semibold text-gray-700">
            スキル名
          </label>
          <input
            id="new-level-set-name"
            type="text"
            value={newSetName}
            onChange={e => setNewSetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegisterSet()}
            placeholder="例：プログラミング／検定レベル"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div className="w-full sm:w-36 shrink-0">
          <label htmlFor="new-level-set-category" className="text-xs font-semibold text-gray-700">
            区分
          </label>
          <select
            id="new-level-set-category"
            value={newSetCategory}
            onChange={e => setNewSetCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="">—</option>
            {SKILL_ITEM_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={isPending || !newSetName.trim()}
          onClick={handleRegisterSet}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          登録
        </button>
      </div>

      <hr className="border-gray-200" />

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                  スキル名
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800 whitespace-nowrap">
                  区分
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-800 whitespace-nowrap w-16">
                  順
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                  レベル
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                  詳細説明
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-800">
                  変更
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-800">
                  削除
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    セットがありません。上のフォームからレベルセット名を登録してください。
                  </td>
                </tr>
              ) : (
                sortedSets.map(set => {
                  const levels = sortLevels(set.levels)
                  return (
                    <Fragment key={set.id}>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <td className="px-3 py-2 align-top">
                          {editSetId === set.id ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                value={editSetName}
                                onChange={e => setEditSetName(e.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isPending || !editSetName.trim()}
                                  onClick={handleSaveSetName}
                                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditSetId(null)}
                                  className="text-xs text-gray-500 hover:text-gray-800"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-900">{set.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingForSetId(set.id)
                                  setNewLvSortOrder(nextSortOrder(levels))
                                  setError(null)
                                }}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                [+レベル]
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {editSetId === set.id ? (
                            <select
                              value={editSetCategory}
                              onChange={e => setEditSetCategory(e.target.value)}
                              className="w-full min-w-[88px] rounded border border-gray-300 px-2 py-1 text-sm"
                            >
                              <option value="">—</option>
                              {SKILL_ITEM_CATEGORIES.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-700">{set.category ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-center text-gray-400">—</td>
                        <td className="px-3 py-2 align-top text-gray-400">—</td>
                        <td className="px-3 py-2 align-top text-gray-400">—</td>
                        <td className="px-3 py-2 text-center align-top">
                          {editSetId !== set.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditSetId(set.id)
                                setEditSetName(set.name)
                                setEditSetCategory(set.category ?? '')
                                setError(null)
                              }}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              変更
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(set.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            削除
                          </button>
                        </td>
                      </tr>

                      {addingForSetId === set.id && (
                        <tr className="border-b border-gray-100 bg-blue-50/40">
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2 align-top text-center">
                            <input
                              type="number"
                              min={0}
                              value={newLvSortOrder}
                              onChange={e =>
                                setNewLvSortOrder(Math.max(0, Number(e.target.value) || 0))
                              }
                              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                              aria-label="表示順"
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              value={newLvName}
                              onChange={e => setNewLvName(e.target.value)}
                              placeholder="レベル名"
                              className="w-full min-w-[100px] rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              value={newLvCriteria}
                              onChange={e => setNewLvCriteria(e.target.value)}
                              placeholder="詳細説明（例：経験年数）"
                              className="w-full min-w-[120px] rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 align-top" colSpan={2}>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex gap-1">
                                {LEVEL_COLORS.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    aria-label={`色 ${c}`}
                                    onClick={() => setNewLvColor(c)}
                                    className="h-5 w-5 rounded-full border-2 transition-all"
                                    style={{
                                      backgroundColor: c,
                                      borderColor: newLvColor === c ? '#374151' : 'transparent',
                                    }}
                                  />
                                ))}
                              </div>
                              <button
                                type="button"
                                disabled={isPending || !newLvName.trim()}
                                onClick={() => handleAddLevel(set.id)}
                                className="rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                              >
                                追加
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingForSetId(null)
                                  setNewLvName('')
                                  setNewLvCriteria('')
                                  setNewLvSortOrder(0)
                                }}
                                className="text-xs text-gray-500 hover:text-gray-800"
                              >
                                キャンセル
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {levels.map(lv => (
                        <tr key={lv.id} className="border-b border-gray-100">
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2 align-top text-center text-gray-700">
                            {editLvId === lv.id ? (
                              <input
                                type="number"
                                min={0}
                                value={editLvSortOrder}
                                onChange={e =>
                                  setEditLvSortOrder(Math.max(0, Number(e.target.value) || 0))
                                }
                                className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                                aria-label="表示順"
                              />
                            ) : (
                              <span className="text-xs tabular-nums">{lv.sort_order}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {editLvId === lv.id ? (
                              <input
                                value={editLvName}
                                onChange={e => setEditLvName(e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: lv.color_hex + '33',
                                  color: lv.color_hex,
                                }}
                              >
                                {lv.name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-gray-700">
                            {editLvId === lv.id ? (
                              <input
                                value={editLvCriteria}
                                onChange={e => setEditLvCriteria(e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-xs">{lv.criteria ?? '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            {editLvId === lv.id ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex justify-center gap-0.5">
                                  {LEVEL_COLORS.map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      aria-label={`色 ${c}`}
                                      onClick={() => setEditLvColor(c)}
                                      className="h-4 w-4 rounded-full border-2"
                                      style={{
                                        backgroundColor: c,
                                        borderColor: editLvColor === c ? '#374151' : 'transparent',
                                      }}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={handleSaveLevel}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditLvId(null)}
                                  className="text-[11px] text-gray-500"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditLvId(lv.id)
                                  setEditLvName(lv.name)
                                  setEditLvCriteria(lv.criteria ?? '')
                                  setEditLvSortOrder(lv.sort_order)
                                  setEditLvColor(lv.color_hex)
                                  setError(null)
                                }}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                変更
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            {editLvId !== lv.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLevel(lv.id)}
                                disabled={isPending}
                                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                              >
                                削除
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
