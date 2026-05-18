'use client'

import { useState } from 'react'
import type { TenantSkillWithRequirements } from '@/features/skill-map/types'
import { TenantJobRoleList } from '@/features/skill-map/components/TenantJobRoleList'
import { TenantJobRoleDetailModal } from '@/features/skill-map/components/TenantJobRoleDetailModal'

type Props = {
  skills: TenantSkillWithRequirements[]
}

export function SkillTempCopyPageClient({ skills }: Props) {
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <TenantJobRoleList skills={skills} onOpenDetail={setDetailSkillId} />

      <TenantJobRoleDetailModal
        open={detailSkillId != null}
        onOpenChange={open => !open && setDetailSkillId(null)}
        skillId={detailSkillId}
      />
    </div>
  )
}
