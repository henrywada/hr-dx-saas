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
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <GlobalJobCategoryManager
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </div>
      <div className="flex-1 min-w-0">
        <GlobalJobRoleList
          roles={roles}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
        />
      </div>
    </div>
  )
}
