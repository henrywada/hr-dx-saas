'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useMemo, useState, useTransition } from 'react'
import {
  SKILL_ITEM_CATEGORIES,
  type SkillLevelWithMappings,
  type TenantSkillLevelSetWithMappings,
} from '../types'
import {
  createTenantSkillLevelSet,
  updateTenantSkillLevelSet,
  deleteTenantSkillLevelSet,
  createTenantSkillLevelInSet,
  updateTenantSkillLevelInSet,
  deleteTenantSkillLevelFromSet,
  addCourseSkillLevelMapping,
  removeCourseSkillLevelMapping,
} from '../actions'

const LEVEL_COLORS = ['#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] as const

type Props = {
  skillLevelSets: TenantSkillLevelSetWithMappings[]
  standaloneSkillLevels?: SkillLevelWithMappings[]
  availableCourses: Array<{ id: string; title: string; status: string }>
  onMutationSuccess?: () => void
}

function sortLevels(levels: SkillLevelWithMappings[]): SkillLevelWithMappings[] {
  return [...levels].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

/** テナント固有スキルレベルセットをテーブルで登録し、セット単位でレベルを CRUD。eラーニング連動付き */
export function TenantSkillLevelSetWorkspace({
  skillLevelSets,
  standaloneSkillLevels = [],
  availableCourses,
  onMutationSuccess,
}: Props) {
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
  const [newLvColor, setNewLvColor] = useState<string>(LEVEL_COLORS[0])

  const [editLvId, setEditLvId] = useState<string | null>(null)
  const [editLvName, setEditLvName] = useState('')
  const [editLvColor, setEditLvColor] = useState('')

  // スタンドアロンレベルの [+レベル] フォーム（クリック時にセット自動作成 → サブ追加）
  const [addingForSaId, setAddingForSaId] = useState<string | null>(null)
  const [saLvName, setSaLvName] = useState('')
  const [saLvColor, setSaLvColor] = useState<string>(LEVEL_COLORS[0])

  // スタンドアロンレベル編集用（セット未所属レベル）
  const [editSaId, setEditSaId] = useState<string | null>(null)
  const [editSaName, setEditSaName] = useState('')
  const [editSaColor, setEditSaColor] = useState('')

  // eラーニング連動用
  const [linkingLevelId, setLinkingLevelId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const sortedStandalone = useMemo(
    () =>
      [...standaloneSkillLevels].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [standaloneSkillLevels]
  )

  function handleAddLevelForStandalone(standaloneLevel: SkillLevelWithMappings) {
    if (!saLvName.trim()) return
    startTransition(async () => {
      const setRes = await createTenantSkillLevelSet({ name: standaloneLevel.name })
      if (!setRes.success) {
        setError('error' in setRes ? setRes.error : 'エラーが発生しました')
        return
      }
      const res = await createTenantSkillLevelInSet({
        skillLevelSetId: setRes.id!,
        name: saLvName.trim(),
        colorHex: saLvColor,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setSaLvName('')
      setSaLvColor(LEVEL_COLORS[0])
      setAddingForSaId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleSaveStandalone() {
    if (!editSaId || !editSaName.trim()) return
    startTransition(async () => {
      const res = await updateTenantSkillLevelInSet({
        id: editSaId,
        name: editSaName.trim(),
        colorHex: editSaColor,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setEditSaId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDeleteStandalone(id: string) {
    if (!confirm('このスキルレベルを削除しますか？')) return
    startTransition(async () => {
      const res = await deleteTenantSkillLevelFromSet({ id })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setEditSaId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleRegisterSet() {
    if (!newSetName.trim()) return
    startTransition(async () => {
      const res = await createTenantSkillLevelSet({
        name: newSetName.trim(),
        category: newSetCategory || undefined,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
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
      const res = await updateTenantSkillLevelSet({
        id: editSetId,
        name: editSetName.trim(),
        category: editSetCategory || null,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setEditSetId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDeleteSet(id: string) {
    if (!confirm('このスキルレベルセットを削除しますか？セット内のレベル定義も削除されます。'))
      return
    startTransition(async () => {
      const res = await deleteTenantSkillLevelSet({ id })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
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
      const res = await createTenantSkillLevelInSet({
        skillLevelSetId: setId,
        name: newLvName.trim(),
        colorHex: newLvColor,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setNewLvName('')
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
      const res = await updateTenantSkillLevelInSet({
        id: editLvId,
        name: editLvName.trim(),
        colorHex: editLvColor,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
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
      const res = await deleteTenantSkillLevelFromSet({ id })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setEditLvId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleAddCourseLink(levelId: string) {
    if (!selectedCourseId) return
    startTransition(async () => {
      const res = await addCourseSkillLevelMapping({
        courseId: selectedCourseId,
        skillLevelId: levelId,
      })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      setLinkingLevelId(null)
      setSelectedCourseId('')
      setError(null)
      router.refresh()
    })
  }

  function handleRemoveCourseLink(mappingId: string) {
    startTransition(async () => {
      const res = await removeCourseSkillLevelMapping({ mappingId })
      if (!res.success) {
        setError('error' in res ? res.error : 'エラーが発生しました')
        return
      }
      router.refresh()
    })
  }

  function renderELearningCell(lv: SkillLevelWithMappings) {
    return (
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap items-center gap-1">
          {lv.courseMappings.map(mapping => (
            <span
              key={mapping.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              {mapping.course.title}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRemoveCourseLink(mapping.id)}
                aria-label="コースリンクを削除"
                className="ml-0.5 text-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))}
          {linkingLevelId === lv.id ? (
            <div className="flex items-center gap-1">
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="rounded border border-gray-300 px-1 py-0.5 text-xs"
              >
                <option value="">コースを選択</option>
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.status !== 'published'
                      ? `（${c.status === 'draft' ? '下書き' : c.status}）`
                      : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isPending || !selectedCourseId}
                onClick={() => handleAddCourseLink(lv.id)}
                className="rounded bg-primary px-1.5 py-0.5 text-xs text-white disabled:opacity-50"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkingLevelId(null)
                  setSelectedCourseId('')
                }}
                className="text-xs text-gray-500"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLinkingLevelId(lv.id)
                setSelectedCourseId('')
                setError(null)
              }}
              className="text-xs text-primary hover:underline"
              aria-label="eラーニングコースを追加"
            >
              ＋
            </button>
          )}
        </div>
      </td>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}

      <div>
        <p className="mb-3 text-xs font-semibold text-gray-600">
          個別レベルマスタ（テンプレートよりコピー済み）
        </p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="new-tenant-level-set-name"
              className="text-xs font-semibold text-gray-700"
            >
              スキル名
            </label>
            <input
              id="new-tenant-level-set-name"
              type="text"
              value={newSetName}
              onChange={e => setNewSetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegisterSet()}
              placeholder="例：プログラミング／検定レベル"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="w-full sm:w-36 shrink-0">
            <label
              htmlFor="new-tenant-level-set-category"
              className="text-xs font-semibold text-gray-700"
            >
              区分
            </label>
            <select
              id="new-tenant-level-set-category"
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
                  <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                    レベル
                  </th>
                  <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                    eラーニング連動
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
                {sortedSets.length === 0 && sortedStandalone.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      データがありません。テンプレートよりコピーするか、スキル名を登録してください。
                    </td>
                  </tr>
                ) : (
                  <>
                    {sortedSets.map(set => {
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
                              <td className="px-3 py-2 align-top">
                                <input
                                  value={newLvName}
                                  onChange={e => setNewLvName(e.target.value)}
                                  placeholder="レベル名"
                                  className="w-full min-w-25 rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2 align-top text-xs text-gray-400">—</td>
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
                              {renderELearningCell(lv)}
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
                                            borderColor:
                                              editLvColor === c ? '#374151' : 'transparent',
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
                    })}
                    {sortedStandalone.length > 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="border-t-2 border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500"
                        >
                          スキル名未設定のレベル（テンプレートよりコピー済み）
                        </td>
                      </tr>
                    )}
                    {sortedStandalone.map(lv => (
                      <Fragment key={lv.id}>
                        <tr className="border-b border-gray-100">
                          <td className="px-3 py-2 align-top text-gray-400">—</td>
                          <td className="px-3 py-2 align-top">
                            {editSaId === lv.id ? (
                              <input
                                value={editSaName}
                                onChange={e => setEditSaName(e.target.value)}
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
                          {renderELearningCell(lv)}
                          <td className="px-3 py-2 text-center align-top">
                            {editSaId === lv.id ? (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={handleSaveStandalone}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditSaId(null)}
                                  className="text-[11px] text-gray-500"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditSaId(lv.id)
                                  setEditSaName(lv.name)
                                  setEditSaColor(lv.color_hex)
                                  setError(null)
                                }}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                変更
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            {editSaId !== lv.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStandalone(lv.id)}
                                disabled={isPending}
                                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                              >
                                削除
                              </button>
                            )}
                          </td>
                        </tr>
                        {addingForSaId === lv.id && (
                          <tr className="border-b border-gray-100 bg-blue-50/40">
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2 align-top">
                              <input
                                value={saLvName}
                                onChange={e => setSaLvName(e.target.value)}
                                placeholder="レベル名"
                                className="w-full min-w-25 rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-gray-400">—</td>
                            <td className="px-3 py-2 align-top" colSpan={2}>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex gap-1">
                                  {LEVEL_COLORS.map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      aria-label={`色 ${c}`}
                                      onClick={() => setSaLvColor(c)}
                                      className="h-5 w-5 rounded-full border-2 transition-all"
                                      style={{
                                        backgroundColor: c,
                                        borderColor: saLvColor === c ? '#374151' : 'transparent',
                                      }}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  disabled={isPending || !saLvName.trim()}
                                  onClick={() => handleAddLevelForStandalone(lv)}
                                  className="rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                                >
                                  追加
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingForSaId(null)
                                    setSaLvName('')
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-800"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
