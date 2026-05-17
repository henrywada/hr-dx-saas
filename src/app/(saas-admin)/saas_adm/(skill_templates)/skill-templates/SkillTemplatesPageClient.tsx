'use client'

import { useState } from 'react'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { GlobalJobCategoryModal } from '@/features/global-skill-templates/components/GlobalJobCategoryModal'
import { GlobalJobRoleDetailModal } from '@/features/global-skill-templates/components/GlobalJobRoleDetailModal'
import { GlobalSkillLevelSetModal } from '@/features/global-skill-templates/components/GlobalSkillLevelSetModal'
import { GlobalJobRoleList } from '@/features/global-skill-templates/components/GlobalJobRoleList'

type Props = {
  categories: GlobalJobCategory[]
  roles: GlobalJobRole[]
}

export function SkillTemplatesPageClient({ categories, roles }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [detailRoleId, setDetailRoleId] = useState<string | null>(null)
  const [skillLevelSetOpen, setSkillLevelSetOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* admin-card-table-style: メイン見出し直下のフィルター行は白サブヘッダー */}
      <div className="-mx-6 -mt-6 mb-6 flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
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
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100"
          >
            業種カテゴリを管理
          </button>
        </div>
      </div>

      <GlobalJobRoleList
        roles={roles}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onOpenDetail={setDetailRoleId}
        onOpenSkillLevelSet={() => setSkillLevelSetOpen(true)}
      />

      <GlobalJobCategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <GlobalJobRoleDetailModal
        open={detailRoleId != null}
        onOpenChange={open => !open && setDetailRoleId(null)}
        roleId={detailRoleId}
      />

      <GlobalSkillLevelSetModal
        open={skillLevelSetOpen}
        onOpenChange={setSkillLevelSetOpen}
        roles={roles}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  )
}
