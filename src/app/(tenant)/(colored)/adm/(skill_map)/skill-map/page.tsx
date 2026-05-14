import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getTenantSkills, getEmployeeSkillRows, getSkillGroupRows } from '@/features/skill-map/queries'
import { SkillMapTabs } from '@/features/skill-map/components/SkillMapTabs'

export default async function SkillMapPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const [skills, employeeRows, skillGroups] = await Promise.all([
    getTenantSkills(supabase),
    getEmployeeSkillRows(supabase),
    getSkillGroupRows(supabase),
  ])

  const divisionMap = new Map<string, string>()
  for (const row of employeeRows) {
    if (row.division_id && row.division_name) divisionMap.set(row.division_id, row.division_name)
  }
  const divisions = Array.from(divisionMap.entries()).map(([id, name]) => ({ id, name }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">スキルマップ</h1>
        <a href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP_REQUIREMENTS} className="text-sm text-primary hover:underline">
          技能別要件 →
        </a>
      </div>
      <SkillMapTabs employeeRows={employeeRows} skillGroups={skillGroups} skills={skills} divisions={divisions} />
    </div>
  )
}
