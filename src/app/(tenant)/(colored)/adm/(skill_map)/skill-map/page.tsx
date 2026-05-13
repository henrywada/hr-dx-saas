import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getSkillMatrixRows,
  getSkills,
  getSkillCategories,
  getProficiencyDefs,
} from '@/features/skill-map/queries'
import { SkillMatrix } from '@/features/skill-map/components/SkillMatrix'

export default async function SkillMapPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const [rows, skills, categories, proficiencyDefs] = await Promise.all([
    getSkillMatrixRows(supabase),
    getSkills(supabase),
    getSkillCategories(supabase),
    getProficiencyDefs(supabase),
  ])

  // スキルが未設定の場合はセットアップ画面にリダイレクト
  if (skills.length === 0) redirect(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SETUP)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">スキルマップ</h1>
        <a
          href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SETUP}
          className="text-sm text-primary underline"
        >
          スキル設定
        </a>
      </div>
      <SkillMatrix
        rows={rows}
        skills={skills}
        categories={categories}
        proficiencyDefs={proficiencyDefs}
      />
    </div>
  )
}
