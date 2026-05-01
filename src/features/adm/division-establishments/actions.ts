'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

export type UpsertEstablishmentInput = {
  id?: string
  name: string
  code?: string | null
  /** 1件以上。テナント内で他拠点と重複できない（DB UNIQUE） */
  anchor_division_ids: string[]
  workplace_address?: string | null
  labor_office_reporting_name?: string | null
}

export async function upsertDivisionEstablishment(
  input: UpsertEstablishmentInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'Unauthorized' }
  }
  const supabase = (await createClient()) as any

  if (!input.name?.trim()) {
    return { success: false, error: '拠点名を入力してください。' }
  }
  const anchorIds = [...new Set((input.anchor_division_ids ?? []).filter(Boolean))]
  if (anchorIds.length === 0) {
    return { success: false, error: 'アンカー部署を1つ以上選択してください。' }
  }

  const row = {
    tenant_id: user.tenant_id,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    workplace_address: input.workplace_address?.trim() || null,
    labor_office_reporting_name: input.labor_office_reporting_name?.trim() || null,
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('division_establishments')
      .update(row)
      .eq('id', input.id)
      .eq('tenant_id', user.tenant_id)
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }

    const { error: delErr } = await supabase
      .from('division_establishment_anchors')
      .delete()
      .eq('division_establishment_id', input.id)
      .eq('tenant_id', user.tenant_id)
    if (delErr) return { success: false, error: delErr.message }

    const insRows = anchorIds.map((division_id) => ({
      tenant_id: user.tenant_id,
      division_establishment_id: input.id,
      division_id,
    }))
    const { error: insErr } = await supabase.from('division_establishment_anchors').insert(insRows)
    if (insErr) return { success: false, error: insErr.message }

    revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
    return { success: true, id: data?.id }
  }

  const { data: created, error: insEstErr } = await supabase
    .from('division_establishments')
    .insert(row)
    .select('id')
    .single()
  if (insEstErr) return { success: false, error: insEstErr.message }

  const newId = created?.id as string
  const insRows = anchorIds.map((division_id) => ({
    tenant_id: user.tenant_id,
    division_establishment_id: newId,
    division_id,
  }))
  const { error: insAnchorErr } = await supabase.from('division_establishment_anchors').insert(insRows)
  if (insAnchorErr) {
    await supabase.from('division_establishments').delete().eq('id', newId).eq('tenant_id', user.tenant_id)
    return { success: false, error: insAnchorErr.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
  return { success: true, id: newId }
}

export async function deleteDivisionEstablishment(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  const supabase = (await createClient()) as any
  const { error } = await supabase
    .from('division_establishments')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
  return { success: true }
}

export async function upsertTenantStressSettings(minGroupAnalysisRespondents: number): Promise<{
  success: boolean
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  const n = Math.floor(Number(minGroupAnalysisRespondents))
  if (!Number.isFinite(n) || n < 1 || n > 10000) {
    return { success: false, error: '最低人数は 1〜10000 の整数で指定してください。' }
  }
  const supabase = (await createClient()) as any
  const { error } = await supabase.from('tenant_stress_settings').upsert(
    {
      tenant_id: user.tenant_id,
      min_group_analysis_respondents: n,
    },
    { onConflict: 'tenant_id' },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS)
  return { success: true }
}
