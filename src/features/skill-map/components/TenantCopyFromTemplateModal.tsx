'use client'

import { useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { importFromGlobalTemplate } from '../actions'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
  onClose: () => void
}

export function TenantCopyFromTemplateModal({ categories, roles, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const rolesByCategory = sortedCategories
    .map(cat => ({
      category: cat,
      roles: roles
        .filter(r => r.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter(g => g.roles.length > 0)

  function handleCopy(roleId: string) {
    startTransition(async () => {
      const res = await importFromGlobalTemplate(roleId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setCopiedIds(prev => new Set([...prev, roleId]))
      setError(null)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">テンプレートよりコピー</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              職種を選んで自テナントの職種マスタにコピーします
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-xl text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mx-5 mt-3 shrink-0 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rolesByCategory.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">
              テンプレートがまだ登録されていません
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 border-b-2 px-4 py-3 text-left text-xs font-semibold text-gray-800">
                    業種
                  </th>
                  <th className="border border-gray-400 border-b-2 border-l-0 px-4 py-3 text-left text-xs font-semibold text-gray-800">
                    職種
                  </th>
                  <th className="border border-gray-400 border-b-2 border-l-0 px-4 py-3 text-center text-xs font-semibold text-gray-800">
                    コピー
                  </th>
                </tr>
              </thead>
              <tbody>
                {rolesByCategory.map(({ category, roles: catRoles }) =>
                  catRoles.map((role, idx) => (
                    <tr
                      key={role.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      {idx === 0 ? (
                        <td
                          className="border border-gray-300 px-4 py-2.5 align-middle text-sm font-medium text-gray-800"
                          rowSpan={catRoles.length}
                        >
                          {category.name}
                        </td>
                      ) : null}

                      <td className="border border-gray-300 border-l-0 px-4 py-2.5 align-middle">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium"
                          style={{
                            backgroundColor: role.color_hex + '33',
                            color: role.color_hex,
                            border: `1px solid ${role.color_hex}88`,
                          }}
                        >
                          {role.name}
                        </span>
                      </td>

                      <td className="border border-gray-300 border-l-0 px-4 py-2.5 text-center align-middle">
                        {copiedIds.has(role.id) ? (
                          <span className="text-xs font-medium text-green-600">✓ コピー済</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCopy(role.id)}
                            disabled={isPending}
                            aria-label="この職種をテナントにコピー"
                            title="コピー"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-sm transition hover:bg-primary hover:text-white hover:shadow-md disabled:opacity-50"
                          >
                            <Copy className="h-4 w-4" strokeWidth={2} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
