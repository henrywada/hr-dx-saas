'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import type { GlobalSkillLevelSetWithLevels } from '../types'
import {
  createGlobalSkillLevelSet,
  deleteGlobalSkillLevelSet,
  updateGlobalSkillLevelSet,
  globalTemplateActionError,
} from '../actions'
import { GlobalSkillLevelManager } from './GlobalSkillLevelManager'

type Props = {
  jobRoleId: string
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
  onMutationSuccess?: () => void
}

/** スキルレベルセットの CRUD と、選択セット内のレベル編集 */
export function GlobalSkillLevelSetWorkspace({
  jobRoleId,
  skillLevelSets,
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

  const [selectedSetId, setSelectedSetId] = useState('')
  useEffect(() => {
    if (sortedSets.length === 0) {
      setSelectedSetId('')
      return
    }
    setSelectedSetId(prev =>
      prev && sortedSets.some(s => s.id === prev) ? prev : sortedSets[0].id
    )
  }, [sortedSets])

  const selectedSet = sortedSets.find(s => s.id === selectedSetId)

  const [newSetName, setNewSetName] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAddSet() {
    if (!newSetName.trim()) return
    startTransition(async () => {
      const res = await createGlobalSkillLevelSet({ jobRoleId, name: newSetName.trim() })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setNewSetName('')
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDeleteSet() {
    if (!selectedSetId) return
    if (
      !confirm(
        'このスキルレベルセットを削除しますか？セット内のレベル定義も削除されます。（スキル項目から参照されている場合は削除できません）'
      )
    )
      return
    startTransition(async () => {
      const res = await deleteGlobalSkillLevelSet({ id: selectedSetId, jobRoleId })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleRenameSave() {
    if (!selectedSetId || !renameValue.trim()) return
    startTransition(async () => {
      const res = await updateGlobalSkillLevelSet({
        id: selectedSetId,
        jobRoleId,
        name: renameValue.trim(),
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setRenameOpen(false)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">スキルレベルセット</h3>
        <p className="mt-1 text-xs text-gray-500">
          セットごとに評価レベル（例：初級・中級・上級／検定1・検定2）を定義します。スキル項目では「どのセットで評価するか」を割り当てます。
        </p>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="skill-level-set-picker"
            className="text-xs font-semibold text-gray-700"
          >
            編集中のセット
          </label>
          <select
            id="skill-level-set-picker"
            value={selectedSetId}
            onChange={e => {
              setSelectedSetId(e.target.value)
              setRenameOpen(false)
              setError(null)
            }}
            disabled={sortedSets.length === 0}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
          >
            {sortedSets.length === 0 ? (
              <option value="">セットなし</option>
            ) : (
              sortedSets.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}（{s.levels.length}段階）
                </option>
              ))
            )}
          </select>
        </div>

        {selectedSet && !renameOpen && (
          <button
            type="button"
            onClick={() => {
              setRenameOpen(true)
              setRenameValue(selectedSet.name)
              setError(null)
            }}
            className="text-xs font-medium text-primary hover:underline sm:mb-2"
          >
            セット名を変更
          </button>
        )}
      </div>

      {renameOpen && selectedSet && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            type="text"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            className="min-w-[160px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
            placeholder="セット名"
          />
          <button
            type="button"
            disabled={isPending || !renameValue.trim()}
            onClick={handleRenameSave}
            className="rounded bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setRenameOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            キャンセル
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          value={newSetName}
          onChange={e => setNewSetName(e.target.value)}
          placeholder="新しいセット名（例：検定レベル）"
          className="min-w-[200px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleAddSet()}
        />
        <button
          type="button"
          disabled={isPending || !newSetName.trim()}
          onClick={handleAddSet}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          セットを追加
        </button>
        <button
          type="button"
          disabled={isPending || sortedSets.length === 0 || !selectedSetId}
          onClick={handleDeleteSet}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
        >
          選択中のセットを削除
        </button>
      </div>

      {selectedSet ? (
        <GlobalSkillLevelManager
          skillLevelSetId={selectedSet.id}
          jobRoleId={jobRoleId}
          levels={selectedSet.levels}
          onMutationSuccess={onMutationSuccess}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
          セットがありません。上のフォームからセットを追加してください。
        </p>
      )}
    </div>
  )
}
