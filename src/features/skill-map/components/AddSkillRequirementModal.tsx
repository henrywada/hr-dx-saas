'use client'

import { useEffect, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { TenantSkillLevelSetWithLevels } from '../types'
import { loadTenantSkillLevelSetsAction, createSkillRequirement } from '../actions'

type Props = {
  skillId: string
  skillName: string
  onClose: () => void
}

export function AddSkillRequirementModal({ skillId, skillName, onClose }: Props) {
  const [levelSets, setLevelSets] = useState<TenantSkillLevelSetWithLevels[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [selectedSetId, setSelectedSetId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTenantSkillLevelSetsAction().then(sets => {
      setLevelSets(sets ?? [])
      setLoading(false)
    })
  }, [])

  const selectedSet = levelSets.find(s => s.id === selectedSetId) ?? null

  function handleSubmit() {
    if (!selectedSetId || !selectedSet) {
      setError('スキルを選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      if (selectedSet.levels.length === 0) {
        // レベルなし：スキル名のみで1件登録
        const res = await createSkillRequirement({ skillId, name: selectedSet.name })
        if (!res.success) {
          setError('error' in res ? res.error : 'エラーが発生しました')
          return
        }
      } else {
        // レベルごとに1件ずつ登録
        for (const lv of selectedSet.levels) {
          const res = await createSkillRequirement({
            skillId,
            name: selectedSet.name,
            levelId: lv.id,
          })
          if (!res.success) {
            setError('error' in res ? res.error : 'エラーが発生しました')
            return
          }
        }
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs text-gray-500">職種：{skillName}</p>
            <h2 className="text-base font-semibold text-gray-900">スキル追加</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="text-xs font-semibold text-gray-700">
              スキル名 <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <p className="mt-1 text-xs text-gray-400">読み込み中...</p>
            ) : levelSets.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">
                「スキル・レベルの管理」タブでスキルを登録してください
              </p>
            ) : (
              <select
                value={selectedSetId}
                onChange={e => setSelectedSetId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">スキルを選択</option>
                {levelSets.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedSet && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-semibold text-gray-600">自動登録されるレベル</p>
              {selectedSet.levels.length === 0 ? (
                <p className="text-xs text-gray-400">レベルなし（スキル名のみ登録）</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSet.levels.map(lv => (
                    <span
                      key={lv.id}
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: lv.color_hex + '33', color: lv.color_hex }}
                    >
                      {lv.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selectedSetId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  )
}
