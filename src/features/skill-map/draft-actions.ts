'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const saveDraftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  snapshot: z.record(z.string(), z.unknown()),
})

export async function saveSkillMapDraft(input: {
  name: string
  snapshot: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }

  const parsed = saveDraftSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('skill_map_drafts').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    created_by: user.employee_id,
    snapshot: JSON.parse(JSON.stringify(parsed.data.snapshot)),
    status: 'draft',
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

export async function deleteSkillMapDraft(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('skill_map_drafts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}
