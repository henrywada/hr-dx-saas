'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

/** グローバルテンプレートを自テナントへコピーする */
export async function copyTemplateToTenant(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: template, error: tErr } = await db
    .from('global_skill_templates')
    .select('id')
    .eq('id', templateId)
    .single()
  if (tErr || !template) return { success: false, error: 'テンプレートが見つかりません' }

  const { data: globalCategories, error: catFetchErr } = await db
    .from('global_skill_categories')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
  if (catFetchErr) return { success: false, error: `カテゴリ取得失敗: ${catFetchErr.message}` }

  const { data: globalSkills, error: skillFetchErr } = await db
    .from('global_skills')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
  if (skillFetchErr) return { success: false, error: `スキル取得失敗: ${skillFetchErr.message}` }

  const { data: globalProfDefs, error: profFetchErr } = await db
    .from('global_proficiency_defs')
    .select('*')
    .eq('template_id', templateId)
    .order('level', { ascending: false })
  if (profFetchErr) return { success: false, error: `習熟度定義取得失敗: ${profFetchErr.message}` }

  const categoryIdMap: Record<string, string> = {}
  for (const cat of globalCategories ?? []) {
    const { data: newCat, error: catErr } = await db
      .from('skill_categories')
      .insert({
        tenant_id: user.tenant_id,
        name: cat.name,
        source_template_id: templateId,
        sort_order: cat.sort_order,
      })
      .select('id')
      .single()
    if (catErr) return { success: false, error: `カテゴリコピー失敗: ${catErr.message}` }
    categoryIdMap[cat.id] = newCat.id
  }

  const skillsToInsert = (globalSkills ?? []).map((s: any) => ({
    tenant_id: user.tenant_id,
    category_id: categoryIdMap[s.category_id],
    name: s.name,
    description: s.description,
    sort_order: s.sort_order,
  }))
  if (skillsToInsert.length > 0) {
    const { error: sErr } = await db.from('skills').insert(skillsToInsert)
    if (sErr) return { success: false, error: `スキルコピー失敗: ${sErr.message}` }
  }

  const profDefsToInsert = (globalProfDefs ?? []).map((p: any) => ({
    tenant_id: user.tenant_id,
    level: p.level,
    label: p.label,
    color_hex: p.color_hex,
  }))
  if (profDefsToInsert.length > 0) {
    const { error: pErr } = await db.from('skill_proficiency_defs').insert(profDefsToInsert)
    if (pErr) return { success: false, error: `習熟度定義コピー失敗: ${pErr.message}` }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** 従業員の習熟度を更新（スキルマトリクスセル編集） */
export async function upsertEmployeeSkill(input: {
  employeeId: string
  skillId: string
  proficiencyLevel: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from('employee_skills').upsert(
    {
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      skill_id: input.skillId,
      proficiency_level: input.proficiencyLevel,
      evaluated_at: new Date().toISOString(),
      evaluated_by: user.employee_id,
    },
    { onConflict: 'tenant_id,employee_id,skill_id' }
  )
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** 資格を従業員に登録 */
export async function addEmployeeQualification(input: {
  employeeId: string
  qualificationId: string
  acquiredDate: string
  expiryDate: string | null
  certNumber: string | null
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from('employee_qualifications').insert({
    tenant_id: user.tenant_id,
    employee_id: input.employeeId,
    qualification_id: input.qualificationId,
    acquired_date: input.acquiredDate || null,
    expiry_date: input.expiryDate || null,
    cert_number: input.certNumber || null,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_QUALIFICATIONS)
  return { success: true }
}

/** 配置シミュレーション下書きを保存 */
export async function saveSkillMapDraft(input: {
  draftId?: string
  name: string
  snapshot: Record<string, string>
}): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (input.draftId) {
    const { error } = await db
      .from('skill_map_drafts')
      .update({ name: input.name, snapshot: input.snapshot, updated_at: new Date().toISOString() })
      .eq('id', input.draftId)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
    return { success: true, draftId: input.draftId }
  }

  const { data, error } = await db
    .from('skill_map_drafts')
    .insert({
      tenant_id: user.tenant_id,
      name: input.name,
      snapshot: input.snapshot,
      created_by: user.employee_id,
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true, draftId: data.id }
}

/** 配置シミュレーションを確定して employees.division_id を一括更新 */
export async function confirmSkillMapDraft(
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: draft, error: dErr } = await db
    .from('skill_map_drafts')
    .select('snapshot')
    .eq('id', draftId)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (dErr || !draft) return { success: false, error: '下書きが見つかりません' }

  const snapshot = draft.snapshot as Record<string, string>
  for (const [employeeId, divisionId] of Object.entries(snapshot)) {
    const { error } = await db
      .from('employees')
      .update({ division_id: divisionId })
      .eq('id', employeeId)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: `更新失敗 (employee: ${employeeId}): ${error.message}` }
  }

  const { error: statusErr } = await db
    .from('skill_map_drafts')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', draftId)
  if (statusErr) return { success: false, error: `ステータス更新失敗: ${statusErr.message}` }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true }
}
