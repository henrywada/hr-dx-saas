'use client'

import { useState } from 'react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { GlobalJobCategoryManager } from '@/features/global-skill-templates/components/GlobalJobCategoryManager'
import { GlobalJobRoleList } from '@/features/global-skill-templates/components/GlobalJobRoleList'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
}

export function SkillTemplatesPageClient({ categories, roles }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* admin-card-table-style: メイン見出し直下のフィルター行は白サブヘッダー */}
      <div className="-mx-6 -mt-6 mb-6 flex flex-col gap-2 border-b border-gray-200 bg-white px-6 py-3.5">
        <p className="text-xs font-medium text-gray-600">業種で職種を絞り込み</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-primary text-white shadow-sm'
                : 'border border-gray-200 bg-gray-50 text-gray-700 shadow-sm hover:bg-gray-100'
            }`}
          >
            すべて
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setSelectedCategoryId(prev => (prev === cat.id ? null : cat.id))
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 shadow-sm hover:bg-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 lg:w-80 xl:w-88">
          <GlobalJobCategoryManager
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        </div>
        <div className="min-w-0 flex-1">
          <GlobalJobRoleList
            roles={roles}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
          />
        </div>
      </div>
    </div>
  )
}
