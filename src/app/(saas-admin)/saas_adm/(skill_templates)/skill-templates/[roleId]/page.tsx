import { createClient } from '@/lib/supabase/server'
import { getGlobalJobRoleDetail } from '@/features/global-skill-templates/queries'
import { GlobalSkillItemManager } from '@/features/global-skill-templates/components/GlobalSkillItemManager'
import { GlobalSkillLevelManager } from '@/features/global-skill-templates/components/GlobalSkillLevelManager'
import { APP_ROUTES } from '@/config/routes'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SkillTemplateDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  const supabase = await createClient()
  const role = await getGlobalJobRoleDetail(supabase, roleId)
  if (!role) notFound()

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-3xl">
        <div className="mb-6">
          <Link
            href={APP_ROUTES.SAAS.SKILL_TEMPLATES}
            className="text-sm text-gray-400 hover:text-primary"
          >
            ← スキルテンプレート一覧
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-base font-semibold"
              style={{ backgroundColor: role.color_hex + '33', color: role.color_hex }}
            >
              {role.name}
            </span>
            <span className="text-sm text-gray-400">{role.category_name}</span>
          </div>
          {role.description && <p className="text-sm text-gray-500 mt-1">{role.description}</p>}
        </div>

        <div className="space-y-8">
          <GlobalSkillItemManager jobRoleId={role.id} items={role.skillItems} />
          <GlobalSkillLevelManager jobRoleId={role.id} levels={role.skillLevels} />
        </div>
      </div>
    </main>
  )
}
