import { createClient } from '@/lib/supabase/server'
import { getGlobalJobCategories, getGlobalJobRoles } from '@/features/global-skill-templates/queries'
import { SkillTemplatesPageClient } from './SkillTemplatesPageClient'

export const dynamic = 'force-dynamic'

export default async function SkillTemplatesPage() {
  const supabase = await createClient()
  const [categories, roles] = await Promise.all([
    getGlobalJobCategories(supabase),
    getGlobalJobRoles(supabase),
  ])

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">スキルテンプレート管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            全テナントが参照できる職種・スキル項目・スキルレベルのテンプレートを管理します
          </p>
        </div>
        <SkillTemplatesPageClient categories={categories} roles={roles} />
      </div>
    </main>
  )
}
