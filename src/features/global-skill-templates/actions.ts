'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalJobRoleDetail, getGlobalSkillLevelSetsWithLevels } from './queries'
import type { GlobalJobRoleDetail, GlobalSkillLevelSetWithLevels, GlobalSkillTemplateActionResult } from './types'

type ActionResult = GlobalSkillTemplateActionResult

const TEMPLATES_PATH = APP_ROUTES.SAAS.SKILL_TEMPLATES
const HEX_RE = /^#[0-9a-fA-F]{6}$/

function isValidHex(hex: string | undefined): boolean {
  return !hex || HEX_RE.test(hex)
}

async function getSaasAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

/** 一覧のモーダルで職種詳細を再取得する際に使用 */
export async function loadGlobalJobRoleDetailAction(
  roleId: string
): Promise<GlobalJobRoleDetail | null> {
  const user = await getSaasAdminUser()
  if (!user) return null
  const supabase = await createClient()
  return getGlobalJobRoleDetail(supabase, roleId)
}

/** スキルレベルセット一覧（モーダル用） */
export async function loadGlobalSkillLevelSetsAction(): Promise<GlobalSkillLevelSetWithLevels[] | null> {
  const user = await getSaasAdminUser()
  if (!user) return null
  const supabase = await createClient()
  return getGlobalSkillLevelSetsWithLevels(supabase)
}

// ---- 業種カテゴリ ----

export async function createGlobalJobCategory(input: { name: string }): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('global_job_categories')
    .insert({ name: input.name })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalJobCategory(input: {
  id: string
  name: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('global_job_categories')
    .update({ name: input.name })
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalJobCategory(id: string): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_job_categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- 職種 ----

export async function createGlobalJobRole(input: {
  categoryId: string
  name: string
  description?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('global_job_roles')
    .insert({
      category_id: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      color_hex: input.colorHex ?? '#3b82f6',
    })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalJobRole(input: {
  id: string
  name?: string
  description?: string | null
  colorHex?: string
  categoryId?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('description' in input) updates.description = input.description
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  if (input.categoryId !== undefined) updates.category_id = input.categoryId
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any)
    .from('global_job_roles')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalJobRole(id: string): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_job_roles').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

async function globalSkillLevelSetExists(supabase: any, setId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('global_skill_level_sets')
    .select('id')
    .eq('id', setId)
    .maybeSingle()
  return !error && !!data
}

async function globalSkillLevelExists(supabase: any, levelId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('global_skill_levels')
    .select('id')
    .eq('id', levelId)
    .maybeSingle()
  return !error && !!data
}

// ---- スキルレベルセット ----

export async function createGlobalSkillLevelSet(input: { name: string }): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_level_sets').insert({
    name: input.name.trim(),
    sort_order: 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillLevelSet(input: {
  id: string
  name: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const ok = await globalSkillLevelSetExists(supabase, input.id)
  if (!ok) return { success: false, error: 'スキルレベルセットが無効です' }
  const { error } = await (supabase as any)
    .from('global_skill_level_sets')
    .update({ name: input.name.trim() })
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalSkillLevelSet(input: { id: string }): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const ok = await globalSkillLevelSetExists(supabase, input.id)
  if (!ok) return { success: false, error: 'スキルレベルセットが無効です' }
  const { count, error: cntErr } = await (supabase as any)
    .from('global_skill_items')
    .select('id', { count: 'exact', head: true })
    .eq('skill_level_set_id', input.id)
  if (cntErr) return { success: false, error: cntErr.message }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error:
        'このセットを参照しているスキル項目があるため削除できません。先に項目の割り当てを変更してください。',
    }
  }
  const { error } = await (supabase as any)
    .from('global_skill_level_sets')
    .delete()
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- スキル項目 ----

export async function createGlobalSkillItem(input: {
  jobRoleId: string
  name: string
  category?: string
  skillLevelSetId: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const ok = await globalSkillLevelSetExists(supabase, input.skillLevelSetId)
  if (!ok)
    return {
      success: false,
      error: 'スキルレベルセットが無効です',
    }
  const { error } = await (supabase as any).from('global_skill_items').insert({
    job_role_id: input.jobRoleId,
    name: input.name,
    category: input.category ?? null,
    skill_level_set_id: input.skillLevelSetId,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  revalidatePath(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(input.jobRoleId))
  return { success: true }
}

export async function updateGlobalSkillItem(input: {
  id: string
  jobRoleId: string
  name?: string
  category?: string | null
  skillLevelSetId?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('category' in input) updates.category = input.category
  if (input.skillLevelSetId !== undefined) {
    const ok = await globalSkillLevelSetExists(supabase, input.skillLevelSetId)
    if (!ok)
      return {
        success: false,
        error: 'スキルレベルセットが無効です',
      }
    updates.skill_level_set_id = input.skillLevelSetId
  }
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any)
    .from('global_skill_items')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  revalidatePath(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(input.jobRoleId))
  return { success: true }
}

export async function deleteGlobalSkillItem(input: {
  id: string
  jobRoleId: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_items').delete().eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  revalidatePath(APP_ROUTES.SAAS.SKILL_TEMPLATE_DETAIL(input.jobRoleId))
  return { success: true }
}

// ---- スキルレベル ----

export async function createGlobalSkillLevel(input: {
  skillLevelSetId: string
  name: string
  criteria?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const ok = await globalSkillLevelSetExists(supabase, input.skillLevelSetId)
  if (!ok) return { success: false, error: 'スキルレベルセットが無効です' }
  const { error } = await (supabase as any).from('global_skill_levels').insert({
    skill_level_set_id: input.skillLevelSetId,
    name: input.name,
    criteria: input.criteria ?? null,
    color_hex: input.colorHex ?? '#6b7280',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillLevel(input: {
  id: string
  name?: string
  criteria?: string | null
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const belongs = await globalSkillLevelExists(supabase, input.id)
  if (!belongs) return { success: false, error: 'スキルレベルが無効です' }
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('criteria' in input) updates.criteria = input.criteria
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any)
    .from('global_skill_levels')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalSkillLevel(input: {
  id: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const belongs = await globalSkillLevelExists(supabase, input.id)
  if (!belongs) return { success: false, error: 'スキルレベルが無効です' }
  const { error } = await (supabase as any).from('global_skill_levels').delete().eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}
