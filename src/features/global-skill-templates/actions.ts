'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'

function assertSaasAdmin(appRole: string | null | undefined) {
  if (appRole !== 'supaUser') throw new Error('権限がありません')
}

/** グローバルスキルカテゴリを追加 */
export async function addGlobalSkillCategory(input: {
  templateId: string
  name: string
  sortOrder: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  assertSaasAdmin(user?.appRole)

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('global_skill_categories').insert({
    template_id: input.templateId,
    name: input.name,
    sort_order: input.sortOrder,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/saas_adm/global-skill-templates')
  return { success: true }
}

/** グローバルスキルを追加 */
export async function addGlobalSkill(input: {
  templateId: string
  categoryId: string
  name: string
  sortOrder: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  assertSaasAdmin(user?.appRole)

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('global_skills').insert({
    template_id: input.templateId,
    category_id: input.categoryId,
    name: input.name,
    sort_order: input.sortOrder,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/saas_adm/global-skill-templates')
  return { success: true }
}
