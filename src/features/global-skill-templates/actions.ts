'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalSkillLevelSetsWithLevels } from './queries'
import type { GlobalSkillLevelSetWithLevels, GlobalSkillTemplateActionResult } from './types'

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

/** スキルレベルセット一覧（モーダル用） */
export async function loadGlobalSkillLevelSetsAction(): Promise<GlobalSkillLevelSetWithLevels[] | null> {
  const user = await getSaasAdminUser()
  if (!user) return null
  const supabase = await createClient()
  return getGlobalSkillLevelSetsWithLevels(supabase)
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

export async function createGlobalSkillLevelSet(input: {
  name: string
  category?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_level_sets').insert({
    name: input.name.trim(),
    category: input.category?.trim() || null,
    sort_order: 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillLevelSet(input: {
  id: string
  name: string
  category?: string | null
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const ok = await globalSkillLevelSetExists(supabase, input.id)
  if (!ok) return { success: false, error: 'スキルレベルセットが無効です' }
  const updates: Record<string, unknown> = { name: input.name.trim() }
  if ('category' in input) updates.category = input.category?.trim() || null
  const { error } = await (supabase as any)
    .from('global_skill_level_sets')
    .update(updates)
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

  const { error } = await (supabase as any)
    .from('global_skill_level_sets')
    .delete()
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }

  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- スキルレベル ----

export async function createGlobalSkillLevel(input: {
  skillLevelSetId: string
  name: string
  criteria?: string
  colorHex?: string
  sortOrder?: number
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
    sort_order: input.sortOrder ?? 0,
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
  sortOrder?: number
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
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder
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
