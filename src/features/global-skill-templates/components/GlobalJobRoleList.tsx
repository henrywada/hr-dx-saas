'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GlobalJobRole, GlobalJobCategory } from '../types'
import { deleteGlobalJobRole } from '../actions'
import { GlobalJobRoleForm } from './GlobalJobRoleForm'
import { APP_ROUTES } from '@/config/routes'

type Props = {
  roles: GlobalJobRole[]
  categories: GlobalJobCategory[]
  selectedCategoryId: string | null
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

export function GlobalJobRoleList({ roles, categories, selectedCategoryId }: Props) {
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
    if (!confirm(`「${name}」を削除しますか？スキル項目・スキルレベルもすべて削除されます。`))
      return
    startTransition(async () => {
      const res = await deleteGlobalJobRole(id)
      if ('error' in res) setError(res.error)
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
        <h3 className="text-sm font-semibold text-gray-800">職種一覧</h3>
        <p className="mt-1 text-xs text-gray-600">
          {selectedCategoryId
            ? `表示中: ${categories.find(c => c.id === selectedCategoryId)?.name ?? '—'}`
            : 'すべての業種の職種を表示しています'}
        </p>
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
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      職種
                    </th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                      説明
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
                          className="px-4 py-2.5 text-sm font-semibold tracking-wide text-gray-800"
                        >
                          {group.categoryName}
                          <span className="ml-2 font-normal text-xs text-gray-500">
                            （{group.roles.length}件）
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right align-middle">
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
                        onClick={() =>
                          router.push(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(role.id))
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            router.push(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(role.id))
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
                        <td className="max-w-xs px-4 py-3 align-top text-gray-600">
                          {role.description ? (
                            <span className="line-clamp-2 text-xs leading-relaxed">
                              {role.description}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={e => {
                                e.stopPropagation()
                                router.push(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(role.id))
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
