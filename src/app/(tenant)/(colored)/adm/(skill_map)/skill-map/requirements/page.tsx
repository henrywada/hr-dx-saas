import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getTenantSkills, getSkillLevels, getSkillRequirements } from '@/features/skill-map/queries'
import { SkillRequirementsTable } from '@/features/skill-map/components/SkillRequirementsTable'
import { SkillLevelManager } from '@/features/skill-map/components/SkillLevelManager'

type Props = { searchParams: Promise<{ skill?: string }> }

export default async function SkillRequirementsPage({ searchParams }: Props) {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const { skill: selectedSkillId } = await searchParams
  const supabase = await createClient()
  const [skills, levels] = await Promise.all([getTenantSkills(supabase), getSkillLevels(supabase)])
  const activeSkillId = selectedSkillId ?? skills[0]?.id ?? ''
  const requirements = activeSkillId ? await getSkillRequirements(supabase, activeSkillId) : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能別要件</h1>
          <p className="text-sm text-gray-500 mt-1">採用・育成計画の基準となる要件を技能ごとに定義します</p>
        </div>
        <a href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP}
          className="text-sm text-gray-500 hover:text-primary border border-gray-200 px-3 py-1.5 rounded">
          ← スキルマップ
        </a>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <SkillLevelManager levels={levels} />
      </div>

      <SkillRequirementsTable
        skills={skills} levels={levels}
        initialRequirements={requirements} initialSkillId={activeSkillId}
      />
    </div>
  )
}
