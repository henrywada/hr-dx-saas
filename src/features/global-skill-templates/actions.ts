'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

type ActionResult = { success: true } | { success: false; error: string }

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
  const { error } = await (supabase as any).from('global_job_roles').insert({
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

// ---- スキル項目 ----

export async function createGlobalSkillItem(input: {
  jobRoleId: string
  name: string
  category?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_items').insert({
    job_role_id: input.jobRoleId,
    name: input.name,
    category: input.category ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalSkillItem(input: {
  id: string
  name?: string
  category?: string | null
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('category' in input) updates.category = input.category
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any)
    .from('global_skill_items')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalSkillItem(id: string): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_items').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- スキルレベル ----

export async function createGlobalSkillLevel(input: {
  jobRoleId: string
  name: string
  criteria?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_levels').insert({
    job_role_id: input.jobRoleId,
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

export async function deleteGlobalSkillLevel(id: string): Promise<ActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('global_skill_levels').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}
