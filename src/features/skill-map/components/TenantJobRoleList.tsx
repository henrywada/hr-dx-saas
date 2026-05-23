'use client'

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { TenantSkillWithRequirements, SkillRequirement } from '../types'
import { createTenantSkill, deleteTenantSkill, deleteSkillRequirementsByName } from '../actions'
import { AddSkillRequirementModal } from './AddSkillRequirementModal'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

type SkillGroup = { name: string; requirements: SkillRequirement[] }

/** スキル名でグループ化して、名前順に並べる */
function groupBySkillName(requirements: SkillRequirement[]): SkillGroup[] {
  const map = new Map<string, SkillRequirement[]>()
  for (const req of requirements) {
    const list = map.get(req.name) ?? []
    list.push(req)
    map.set(req.name, list)
  }
  return Array.from(map.entries())
    .map(([name, reqs]) => ({
      name,
      requirements: [...reqs].sort((a, b) => {
        const orderA = a.level?.sort_order ?? a.sort_order ?? 0
        const orderB = b.level?.sort_order ?? b.sort_order ?? 0
        if (orderA !== orderB) return orderA - orderB
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
          a.id.localeCompare(b.id)
        )
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

function levelComment(req: SkillRequirement): string {
  const text = req.criteria?.trim() || req.level?.criteria?.trim()
  return text || '—'
}

type Props = {
  skills: TenantSkillWithRequirements[]
  onOpenDetail?: (skillId: string) => void
}

export function TenantJobRoleList({ skills, onOpenDetail }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [error, setError] = useState<string | null>(null)

  const [addReqTarget, setAddReqTarget] = useState<{ id: string; name: string } | null>(null)

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createTenantSkill({ name: newName.trim(), colorHex: newColor })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setNewName('')
      setNewColor('#3b82f6')
      setShowAddForm(false)
      setError(null)
      router.refresh()
    })
  }

  function handleDeleteSkillGroup(skillId: string, groupName: string) {
    if (!confirm(`「${groupName}」とそのレベルをすべて削除しますか？`)) return
    startTransition(async () => {
      const res = await deleteSkillRequirementsByName({ skillId, name: groupName })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      router.refresh()
    })
  }

  function handleDeleteJob(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？この職種のスキル・レベルもすべて削除されます。`)) return
    startTransition(async () => {
      const res = await deleteTenantSkill(id)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      router.refresh()
    })
  }

  const thBase =
    'border-b border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 align-middle'
  const tdBase = 'border-b border-gray-100 px-3 py-2 align-top'

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-300 bg-gray-200 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              職種・スキル管理（職種にスキルを登録する）
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(v => !v)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:opacity-95 sm:text-sm"
            >
              ＋ 職種を追加
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
            {error && (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="職種名（例：プログラマー）"
                autoFocus
                className="min-w-45 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? '#374151' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !newName.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                登録
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setError(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="p-4">
          {error && !showAddForm && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {skills.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">職種がまだ登録されていません</p>
              <p className="mt-1 text-xs text-gray-400">
                「テンプレートよりコピー」か「＋ 職種を追加」から作成してください
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className={`${thBase} text-left`}>職種</th>
                    <th className={`${thBase} text-left`}>スキル名</th>
                    <th className={`${thBase} text-left`}>レベル</th>
                    <th className={`${thBase} text-left`}>詳細説明</th>
                    <th className={`${thBase} text-right whitespace-nowrap`}>削除</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill, idx) => {
                    const groups = groupBySkillName(skill.requirements)
                    const baseBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

                    return (
                      <Fragment key={skill.id}>
                        <tr
                          className={`border-b border-gray-100 ${baseBg} transition-[background-color] duration-200 hover:bg-gray-100`}
                        >
                          <td className={tdBase}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-sm font-medium"
                                style={{
                                  backgroundColor: skill.color_hex + '33',
                                  color: skill.color_hex,
                                  border: `1px solid ${skill.color_hex}88`,
                                }}
                              >
                                {skill.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setAddReqTarget({ id: skill.id, name: skill.name })
                                }
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                ＋追加
                              </button>
                            </div>
                          </td>
                          <td className={tdBase} />
                          <td className={tdBase} />
                          <td className={tdBase} />
                          <td className={`${tdBase} text-right align-middle`}>
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(skill.id, skill.name)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              削除
                            </button>
                          </td>
                        </tr>

                        {groups.length === 0 ? (
                          <tr className={baseBg}>
                            <td className={tdBase} />
                            <td className={`${tdBase} text-xs text-gray-400`} colSpan={3}>
                              スキル要件がありません。「＋追加」から登録してください。
                            </td>
                            <td className={tdBase} />
                          </tr>
                        ) : (
                          groups.map(group => (
                            <Fragment key={`${skill.id}-${group.name}`}>
                              <tr
                                className={`border-b border-gray-100 ${baseBg} transition-[background-color] duration-200 hover:bg-gray-100`}
                              >
                                <td className={tdBase} />
                                <td className={tdBase}>
                                  {onOpenDetail ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetail(skill.id)}
                                      className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80 hover:bg-gray-200"
                                    >
                                      {group.name}
                                    </button>
                                  ) : (
                                    <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80">
                                      {group.name}
                                    </span>
                                  )}
                                </td>
                                <td className={tdBase} />
                                <td className={tdBase} />
                                <td className={`${tdBase} text-right align-middle`}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteSkillGroup(skill.id, group.name)
                                    }
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                                    削除
                                  </button>
                                </td>
                              </tr>

                              {group.requirements.map(req => (
                                <tr key={req.id} className={`border-b border-gray-100 ${baseBg}`}>
                                  <td className={tdBase} />
                                  <td className={tdBase} />
                                  <td className={tdBase}>
                                    <span
                                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                                      style={{
                                        backgroundColor:
                                          (req.level?.color_hex ?? '#6b7280') + '33',
                                        color: req.level?.color_hex ?? '#6b7280',
                                      }}
                                    >
                                      {req.level?.name ?? (
                                        <span className="font-normal text-amber-700">未設定</span>
                                      )}
                                    </span>
                                  </td>
                                  <td
                                    className={`${tdBase} max-w-md text-xs leading-relaxed text-gray-600`}
                                  >
                                    {levelComment(req)}
                                  </td>
                                  <td className={tdBase} />
                                </tr>
                              ))}
                            </Fragment>
                          ))
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {addReqTarget && (
        <AddSkillRequirementModal
          skillId={addReqTarget.id}
          skillName={addReqTarget.name}
          onClose={() => {
            setAddReqTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
