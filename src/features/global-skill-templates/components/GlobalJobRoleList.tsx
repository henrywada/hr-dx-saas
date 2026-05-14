'use client'

import { useState, useTransition } from 'react'
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

export function GlobalJobRoleList({ roles, categories, selectedCategoryId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? roles.filter(r => r.category_id === selectedCategoryId)
    : roles

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？スキル項目・スキルレベルもすべて削除されます。`)) return
    startTransition(async () => {
      const res = await deleteGlobalJobRole(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          職種一覧{selectedCategoryId && (
            <span className="text-gray-400 font-normal ml-1">
              — {categories.find(c => c.id === selectedCategoryId)?.name}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm"
        >
          ＋ 職種を追加
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">職種がありません</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(role => (
            <div
              key={role.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => router.push(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(role.id))}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: role.color_hex + '33',
                    color: role.color_hex,
                    border: `1px solid ${role.color_hex}88`,
                  }}
                >
                  {role.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(role.id, role.name) }}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                >
                  削除
                </button>
              </div>
              {role.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{role.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{role.category_name}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GlobalJobRoleForm
          categories={categories}
          defaultCategoryId={selectedCategoryId ?? undefined}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
