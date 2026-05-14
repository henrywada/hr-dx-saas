'use client'

import { useState, useTransition } from 'react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { importFromGlobalTemplate } from '../actions'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
  onClose: () => void
}

export function ImportFromTemplateModal({ categories, roles, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? roles.filter(r => r.category_id === selectedCategoryId)
    : roles

  function handleImport(roleId: string) {
    startTransition(async () => {
      const res = await importFromGlobalTemplate(roleId)
      if ('error' in res) { setError(res.error); return }
      setImportedIds(prev => new Set([...prev, roleId]))
      setError(null)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">テンプレートから取り込む</h2>
            <p className="text-sm text-gray-500">職種を選んで自テナントの技能マスタにコピーします</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex gap-2 px-5 py-3 border-b flex-wrap">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${!selectedCategoryId ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            すべて
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedCategoryId === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">テンプレートがありません</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(role => {
                const isImported = importedIds.has(role.id)
                return (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: role.color_hex + '33', color: role.color_hex, border: `1px solid ${role.color_hex}88` }}
                      >
                        {role.name}
                      </span>
                      {isImported && <span className="text-xs text-green-600 font-medium">✓ 取り込み済み</span>}
                    </div>
                    {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
                    <p className="text-xs text-gray-400">{role.category_name}</p>
                    <button
                      onClick={() => handleImport(role.id)}
                      disabled={isPending}
                      className="w-full border border-primary text-primary py-1.5 rounded text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isImported ? '再度取り込む' : '取り込む'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t">
          <button onClick={onClose} className="w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
