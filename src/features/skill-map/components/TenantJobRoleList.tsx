'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PanelRight, Trash2 } from 'lucide-react'
import type { TenantSkillWithRequirements, SkillRequirement } from '../types'
import { createTenantSkill, deleteTenantSkill } from '../actions'

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

/** 同一職種内で複数レベルがあると skill_requirement が同名で複数行になるため、スキル名は 1 行に代表して表示 */
function uniqueRequirementDisplayNames(
  requirements: SkillRequirement[]
): Array<{ name: string; category: string | null }> {
  const seen = new Set<string>()
  const out: Array<{ name: string; category: string | null }> = []
  for (const req of requirements) {
    if (seen.has(req.name)) continue
    seen.add(req.name)
    out.push({ name: req.name, category: req.category ?? null })
  }
  return out
}

function ReqNameList({ requirements }: { requirements: SkillRequirement[] }) {
  if (requirements.length === 0) return <span className="text-xs text-gray-400">—</span>
  const items = uniqueRequirementDisplayNames(requirements)
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item.name}
          className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80"
          title={item.category ? `カテゴリ: ${item.category}` : undefined}
        >
          {item.name}
        </span>
      ))}
    </div>
  )
}

function ReqLevelList({ requirements }: { requirements: SkillRequirement[] }) {
  if (requirements.length === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {requirements.map(req => (
        <span
          key={req.id}
          className="inline-flex max-w-full items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/90"
        >
          {req.level?.name ?? <span className="font-normal text-amber-700">未設定</span>}
        </span>
      ))}
    </div>
  )
}

type Props = {
  skills: TenantSkillWithRequirements[]
  onOpenDetail: (skillId: string) => void
}

export function TenantJobRoleList({ skills, onOpenDetail }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [error, setError] = useState<string | null>(null)

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

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？この職種のスキル要件もすべて削除されます。`)) return
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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-300 bg-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-800">職種一覧</h3>
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
              className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
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
        {skills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">職種がまだ登録されていません</p>
            <p className="mt-1 text-xs text-gray-400">
              「テンプレートよりコピー」か「＋ 職種を追加」から作成してください
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      職種
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      スキル名
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      レベル
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill, idx) => (
                    <tr
                      key={skill.id}
                      role="button"
                      aria-label={`${skill.name} の詳細を開く`}
                      tabIndex={0}
                      onClick={() => onOpenDetail(skill.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenDetail(skill.id)
                        }
                      }}
                      className={`cursor-pointer border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
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
                      </td>
                      <td
                        className="max-w-xl min-w-[160px] px-4 py-3 align-top"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                      >
                        <ReqNameList requirements={skill.requirements} />
                      </td>
                      <td
                        className="max-w-xl min-w-[160px] px-4 py-3 align-top"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                      >
                        <ReqLevelList requirements={skill.requirements} />
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            aria-label="詳細を開く"
                            title="詳細"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-sm transition hover:bg-primary/15 hover:shadow-md"
                            onClick={e => {
                              e.stopPropagation()
                              onOpenDetail(skill.id)
                            }}
                          >
                            <PanelRight className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            aria-label="削除"
                            title="削除"
                            onClick={e => {
                              e.stopPropagation()
                              handleDelete(skill.id, skill.name)
                            }}
                            disabled={isPending}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
