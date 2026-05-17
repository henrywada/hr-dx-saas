'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import type { GlobalSkillItem, GlobalSkillLevelSetWithLevels } from '../types'
import { createGlobalSkillItem, updateGlobalSkillItem, deleteGlobalSkillItem, globalTemplateActionError } from '../actions'

const CATEGORIES = ['技術', '知識', '資格', '経験'] as const

type Props = {
  jobRoleId: string
  items: GlobalSkillItem[]
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
  onMutationSuccess?: () => void
}

export function GlobalSkillItemManager({
  jobRoleId,
  items,
  skillLevelSets,
  onMutationSuccess,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const sortedSets = useMemo(
    () =>
      [...skillLevelSets].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [skillLevelSets]
  )
  const [newSkillLevelSetId, setNewSkillLevelSetId] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSkillLevelSetId, setEditSkillLevelSetId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const first = sortedSets[0]?.id
    if (first && !newSkillLevelSetId) setNewSkillLevelSetId(first)
  }, [sortedSets, newSkillLevelSetId])

  function handleCreate() {
    if (!newName.trim() || !newSkillLevelSetId) return
    startTransition(async () => {
      const res = await createGlobalSkillItem({
        jobRoleId,
        name: newName.trim(),
        category: newCategory || undefined,
        skillLevelSetId: newSkillLevelSetId,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setNewName('')
      setNewCategory('')
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim() || !editSkillLevelSetId) return
    startTransition(async () => {
      const res = await updateGlobalSkillItem({
        id: editId,
        jobRoleId,
        name: editName.trim(),
        category: editCategory || null,
        skillLevelSetId: editSkillLevelSetId,
      })
      const err = globalTemplateActionError(res)
      if (err) {
        setError(err)
        return
      }
      setEditId(null)
      setError(null)
      onMutationSuccess?.()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('このスキル項目を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteGlobalSkillItem({ id, jobRoleId })
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">スキル項目</h3>
      <p className="text-xs text-gray-500">
        各スキルに、この職種のスキルレベルセットを1つ割り当てます（例：技術スキルには「経験年数セット」、資格には「検定セット」）。セット未定義のときは「スキルレベルセット登録」から先に作成してください。
      </p>
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
        <select
          value={newSkillLevelSetId}
          onChange={e => setNewSkillLevelSetId(e.target.value)}
          disabled={sortedSets.length === 0}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px]"
        >
          {sortedSets.length === 0 ? (
            <option value="">セット未登録</option>
          ) : (
            sortedSets.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={handleCreate}
          disabled={
            isPending || !newName.trim() || sortedSets.length === 0 || !newSkillLevelSetId
          }
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
              <th className="text-left px-3 py-2 font-medium text-gray-700">スキルレベルセット</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs">
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
                      <td className="px-2 py-1.5">
                        <select
                          value={editSkillLevelSetId}
                          onChange={e => setEditSkillLevelSetId(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        >
                          {sortedSets.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={isPending}
                          className="text-xs text-primary font-medium mr-2"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="text-xs text-gray-500"
                        >
                          ×
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-gray-500">{item.category ?? '—'}</td>
                      <td className="px-3 py-2">
                        {item.skill_level_set ? (
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/90">
                            {item.skill_level_set.name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">未設定</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(item.id)
                            setEditName(item.name)
                            setEditCategory(item.category ?? '')
                            setEditSkillLevelSetId(
                              item.skill_level_set_id ?? sortedSets[0]?.id ?? ''
                            )
                          }}
                          className="text-xs text-gray-400 hover:text-primary mr-2"
                        >
                          編集
                        </button>
                        <button
                          type="button"
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
