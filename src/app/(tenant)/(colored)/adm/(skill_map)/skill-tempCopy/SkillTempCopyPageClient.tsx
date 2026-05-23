'use client'

import { useState } from 'react'
import type { GlobalSkillLevelSetWithLevels } from '@/features/global-skill-templates/types'
import type {
  TenantSkillWithRequirements,
  TenantSkillLevelSetWithMappings,
  SkillLevelWithMappings,
} from '@/features/skill-map/types'
import { TenantJobRoleList } from '@/features/skill-map/components/TenantJobRoleList'
import { SkillTempCopyTemplateButton } from './SkillTempCopyTemplateButton'
import { TenantJobRoleDetailModal } from '@/features/skill-map/components/TenantJobRoleDetailModal'
import { TenantSkillLevelSetWorkspace } from '@/features/skill-map/components/TenantSkillLevelSetWorkspace'

type Tab = 'roles' | 'levels'

type Props = {
  skills: TenantSkillWithRequirements[]
  templateSkillLevelSets: GlobalSkillLevelSetWithLevels[]
  skillLevelSets: TenantSkillLevelSetWithMappings[]
  standaloneSkillLevels: SkillLevelWithMappings[]
  availableCourses: Array<{ id: string; title: string; status: string }>
}

export function SkillTempCopyPageClient({
  skills,
  templateSkillLevelSets,
  skillLevelSets,
  standaloneSkillLevels,
  availableCourses,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('roles')
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'roles'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          職種の管理
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'levels'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          スキル・レベルの管理
        </button>
      </div>

      {activeTab === 'roles' && (
        <div className="space-y-4">
          <TenantJobRoleList skills={skills} onOpenDetail={setDetailSkillId} />
          <TenantJobRoleDetailModal
            open={detailSkillId != null}
            onOpenChange={open => !open && setDetailSkillId(null)}
            skillId={detailSkillId}
          />
        </div>
      )}

      {activeTab === 'levels' && (
        <TenantSkillLevelSetWorkspace
          skillLevelSets={skillLevelSets}
          standaloneSkillLevels={standaloneSkillLevels}
          availableCourses={availableCourses}
          sectionHeaderAction={
            <SkillTempCopyTemplateButton skillLevelSets={templateSkillLevelSets} />
          }
        />
      )}
    </div>
  )
}
