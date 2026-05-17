'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GlobalJobRole, GlobalJobCategory, GlobalSkillItem } from '../types'
import { deleteGlobalJobRole } from '../actions'
import { GlobalJobRoleForm } from './GlobalJobRoleForm'

/** 業種グループ内で職種横断のユニークなスキル名（sort_order 昇順・同名は初出優先） */
function aggregatedSkillNamesForCategory(roles: GlobalJobRole[]): string[] {
  const seenOrder = new Map<string, number>()
  for (const r of roles) {
    const items = [...(r.skill_items ?? [])].sort(
      (a: GlobalSkillItem, b: GlobalSkillItem) =>
        a.sort_order - b.sort_order ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    for (const it of items) {
      if (!seenOrder.has(it.name)) seenOrder.set(it.name, it.sort_order)
    }
  }
  return [...seenOrder.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([n]) => n)
}

/** 業種グループ内で、スキル項目に紐づくスキルレベルセット名のユニーク一覧（項目の並び順どおりに初出優先） */
function aggregatedSkillLevelSetNamesFromItems(roles: GlobalJobRole[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const r of roles) {
    const items = [...(r.skill_items ?? [])].sort(
      (a: GlobalSkillItem, b: GlobalSkillItem) =>
        a.sort_order - b.sort_order ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    for (const it of items) {
      const name = it.skill_level_set?.name
      if (!name || seen.has(name)) continue
      seen.add(name)
      ordered.push(name)
    }
  }
  return ordered
}

function SkillItemPills({ items }: { items: GlobalSkillItem[] }) {
  if (items.length === 0)
    return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => (
        <span
          key={it.id}
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800 ring-1 ring-gray-200/80"
          title={
            it.category
              ? `${it.name}（${it.category}）`
              : it.skill_level_set
                ? `${it.name} — ${it.skill_level_set.name}`
                : it.name
          }
        >
          <span className="font-medium">{it.name}</span>
          {it.skill_level_set ? (
            <span className="rounded px-1.5 py-0 text-[11px] font-semibold bg-slate-100 text-slate-800 ring-1 ring-slate-200/90">
              {it.skill_level_set.name}
            </span>
          ) : (
            <span className="text-[11px] text-amber-700">セット未設定</span>
          )}
        </span>
      ))}
    </div>
  )
}

type Props = {
  roles: GlobalJobRole[]
  categories: GlobalJobCategory[]
  selectedCategoryId: string | null
  onOpenDetail: (roleId: string) => void
  onOpenSkillLevelSet: () => void
}

type RoleGroup = {
  categoryId: string
  categoryName: string
  roles: GlobalJobRole[]
}

/** フィルター後に業種順でグルーピング（同一業種は sort_order） */
function buildRoleGroups(
  filtered: GlobalJobRole[],
  categories: GlobalJobCategory[],
  selectedCategoryId: string | null
): RoleGroup[] {
  const catOrder = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const orderIds = selectedCategoryId
    ? catOrder.filter(c => c.id === selectedCategoryId).map(c => c.id)
    : catOrder.map(c => c.id)
  const nameById = new Map(categories.map(c => [c.id, c.name]))

  return orderIds
    .map(categoryId => {
      const list = filtered
        .filter(r => r.category_id === categoryId)
        .sort((a, b) => a.sort_order - b.sort_order)
      return {
        categoryId,
        categoryName: nameById.get(categoryId) ?? '—',
        roles: list,
      }
    })
    .filter(g => g.roles.length > 0)
}

export function GlobalJobRoleList({
  roles,
  categories,
  selectedCategoryId,
  onOpenDetail,
  onOpenSkillLevelSet,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [jobFormPresetCategoryId, setJobFormPresetCategoryId] = useState<string | undefined>(
    undefined
  )
  const [jobFormLockCategory, setJobFormLockCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? roles.filter(r => r.category_id === selectedCategoryId)
    : roles

  const groups = useMemo(
    () => buildRoleGroups(filtered, categories, selectedCategoryId),
    [filtered, categories, selectedCategoryId]
  )

  /** ピルで1業種に絞っているときはテーブル見出し行を省略 */
  const showIndustrySectionRow = selectedCategoryId === null

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？スキル項目・スキルレベルセットもすべて削除されます。`))
      return
    startTransition(async () => {
      const res = await deleteGlobalJobRole(id)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      router.refresh()
    })
  }

  /** ヘッダー廃止後: 一覧が空で「すべて」のときのみプルダウン変更可で開く */
  function openJobRoleFormUnlocked() {
    setJobFormPresetCategoryId(undefined)
    setJobFormLockCategory(false)
    setShowForm(true)
  }

  function openJobRoleFormFromIndustryRow(categoryId: string) {
    setJobFormPresetCategoryId(categoryId)
    setJobFormLockCategory(true)
    setShowForm(true)
  }

  function closeJobRoleForm() {
    setShowForm(false)
    setJobFormLockCategory(false)
    setJobFormPresetCategoryId(undefined)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-300 bg-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">職種一覧</h3>
            <p className="mt-1 text-xs text-gray-600">
              {selectedCategoryId
                ? `表示中: ${categories.find(c => c.id === selectedCategoryId)?.name ?? '—'}`
                : 'すべての業種の職種を表示しています'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSkillLevelSet}
            disabled={filtered.length === 0}
            title={filtered.length === 0 ? '職種を追加すると利用できます' : undefined}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            +スキルレベルセット登録
          </button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {/* 絞り込み中は業種見出し行が無いので、カード本文に追加導線を出す */}
        {selectedCategoryId != null && groups.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => openJobRoleFormFromIndustryRow(selectedCategoryId)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              ＋ 職種を追加
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">該当する職種がありません</p>
            <p className="mt-1 text-xs text-gray-400">
              別の業種を選ぶか、職種を追加してください
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  selectedCategoryId
                    ? openJobRoleFormFromIndustryRow(selectedCategoryId)
                    : openJobRoleFormUnlocked()
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                ＋ 職種を追加
              </button>
            </div>
          </div>
        ) : (
          <>
            {selectedCategoryId != null && groups.length > 0 && (() => {
              const allRoles = groups.flatMap(g => g.roles)
              const skillNames = aggregatedSkillNamesForCategory(allRoles)
              const levelNames = aggregatedSkillLevelSetNamesFromItems(allRoles)
              return (
                <div className="mb-3 space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div>
                    <span className="text-xs font-semibold text-gray-700">業種に紐づくスキル</span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {skillNames.length === 0 ? (
                        <span className="text-xs text-gray-500">
                          まだスキル項目がありません（各職種の詳細から追加できます）
                        </span>
                      ) : (
                        skillNames.map(name => (
                          <span
                            key={name}
                            className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/90"
                          >
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-700">
                      業種に紐づくスキルレベルセット
                    </span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {levelNames.length === 0 ? (
                        <span className="text-xs text-gray-500">
                          まだスキルレベルセットがありません（「+スキルレベルセット登録」または各職種の詳細から追加できます）
                        </span>
                      ) : (
                        levelNames.map(name => (
                          <span
                            key={name}
                            className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/90"
                          >
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      職種
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      スキル・レベルセット
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                      操作
                    </th>
                  </tr>
                </thead>
                {groups.map(group => (
                  <tbody key={group.categoryId}>
                    {showIndustrySectionRow && (
                      <tr className="border-b border-gray-200 bg-gray-100">
                        <td
                          colSpan={2}
                          className="px-4 py-2.5 align-top text-sm font-semibold tracking-wide text-gray-800"
                        >
                          <div>
                            {group.categoryName}
                            <span className="ml-2 font-normal text-xs text-gray-500">
                              （{group.roles.length}件）
                            </span>
                          </div>
                          {(() => {
                            const skillNames = aggregatedSkillNamesForCategory(group.roles)
                            const levelNames = aggregatedSkillLevelSetNamesFromItems(group.roles)
                            if (skillNames.length === 0 && levelNames.length === 0) {
                              return (
                                <p className="mt-1.5 text-xs font-normal text-gray-500">
                                  この業種の職種にはまだスキル項目・スキルレベルセットがありません（詳細から追加できます）
                                </p>
                              )
                            }
                            return (
                              <div className="mt-2 space-y-2">
                                {skillNames.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-normal text-gray-600">
                                      業種に紐づくスキル:
                                    </span>
                                    {skillNames.map(name => (
                                      <span
                                        key={name}
                                        className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/90"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {levelNames.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-normal text-gray-600">
                                      業種に紐づくスキルレベルセット:
                                    </span>
                                    {levelNames.map(name => (
                                      <span
                                        key={name}
                                        className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/90"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right align-top">
                          <button
                            type="button"
                            onClick={() => openJobRoleFormFromIndustryRow(group.categoryId)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
                          >
                            ＋ 職種を追加
                          </button>
                        </td>
                      </tr>
                    )}
                    {group.roles.map((role, idx) => (
                      <tr
                        key={role.id}
                        role="button"
                        aria-label={`${role.name} のテンプレート詳細を開く`}
                        tabIndex={0}
                        onClick={() => onOpenDetail(role.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpenDetail(role.id)
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
                              backgroundColor: role.color_hex + '33',
                              color: role.color_hex,
                              border: `1px solid ${role.color_hex}88`,
                            }}
                          >
                            {role.name}
                          </span>
                        </td>
                        <td
                          className="max-w-xl min-w-[200px] px-4 py-3 align-top"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          <SkillItemPills items={role.skill_items ?? []} />
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={e => {
                                e.stopPropagation()
                                onOpenDetail(role.id)
                              }}
                            >
                              詳細
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                handleDelete(role.id, role.name)
                              }}
                              disabled={isPending}
                              className="text-xs text-gray-400 hover:text-red-600 hover:underline disabled:opacity-50"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <GlobalJobRoleForm
          key={`${jobFormPresetCategoryId ?? 'default'}-${jobFormLockCategory ? 'lock' : 'open'}`}
          categories={categories}
          defaultCategoryId={
            jobFormPresetCategoryId ?? selectedCategoryId ?? categories[0]?.id
          }
          lockCategorySelect={jobFormLockCategory}
          onClose={closeJobRoleForm}
        />
      )}
    </div>
  )
}
